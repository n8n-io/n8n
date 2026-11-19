#!/usr/bin/env python3
"""
Audio Ducking and Mixing Tool

Advanced audio processing for video production:
- Automatic ducking (lower music when dialogue plays)
- Multi-track mixing with individual volume control
- Audio normalization (loudness standards)
- Compression and limiting
- EQ and filtering

Usage:
    python audio_mixer.py duck --video input.mp4 --music music.mp3 -o output.mp4
    python audio_mixer.py mix --video input.mp4 --tracks audio1.wav audio2.wav -o output.mp4
    python audio_mixer.py normalize --video input.mp4 --target -16 -o output.mp4
    python audio_mixer.py replace --video input.mp4 --audio new_audio.wav -o output.mp4
"""

import argparse
import subprocess
import sys
import os
import json
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional, Tuple


@dataclass
class AudioTrack:
    """Represents an audio track for mixing."""
    path: str
    volume: float = 1.0
    delay_ms: int = 0
    pan: float = 0.0  # -1.0 (left) to 1.0 (right)
    fade_in: float = 0.0
    fade_out: float = 0.0


@dataclass
class DuckingConfig:
    """Configuration for audio ducking."""
    threshold: float = 0.03  # Voice detection threshold (0.0-1.0)
    ratio: float = 4.0  # Compression ratio when ducking
    attack_ms: int = 200  # How fast to duck (ms)
    release_ms: int = 1000  # How fast to restore (ms)
    music_level: float = 0.2  # Music level when ducked (0.0-1.0)
    normal_music_level: float = 0.5  # Music level when not ducking


def run_ffmpeg(cmd: list, description: str = "") -> bool:
    """Execute FFmpeg command."""
    print(f"🎵 {description or 'Processing audio'}...")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"⚠️  {result.stderr[:500]}")
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def get_audio_info(file_path: str) -> Optional[dict]:
    """Get audio stream information."""
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        "-select_streams", "a",
        file_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(result.stdout)
        streams = data.get("streams", [])
        return streams[0] if streams else None
    except:
        return None


def detect_silence(file_path: str, threshold_db: float = -30, min_duration: float = 0.5) -> List[Tuple[float, float]]:
    """Detect silent periods in audio."""
    cmd = [
        "ffmpeg", "-i", file_path,
        "-af", f"silencedetect=n={threshold_db}dB:d={min_duration}",
        "-f", "null", "-"
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    silences = []
    current_start = None

    for line in result.stderr.split("\n"):
        if "silence_start:" in line:
            try:
                current_start = float(line.split("silence_start:")[1].strip())
            except:
                pass
        elif "silence_end:" in line and current_start is not None:
            try:
                end = float(line.split("silence_end:")[1].split()[0])
                silences.append((current_start, end))
                current_start = None
            except:
                pass

    return silences


class AudioDucker:
    """Automatic audio ducking - lower music when dialogue plays."""

    def __init__(self, config: DuckingConfig = None):
        self.config = config or DuckingConfig()

    def duck_with_sidechain(
        self,
        video_path: str,
        music_path: str,
        output_path: str,
        voice_track: int = 0
    ) -> bool:
        """Duck music using sidechain compression from voice track."""

        config = self.config

        # Use sidechaincompress filter
        # The voice track triggers compression on the music track
        filter_complex = f"""
        [0:a]asplit[voice][duck_trigger];
        [1:a]volume={config.normal_music_level}[music_scaled];
        [music_scaled][duck_trigger]sidechaincompress=
            threshold={config.threshold}:
            ratio={config.ratio}:
            attack={config.attack_ms}:
            release={config.release_ms}:
            level_in=1:
            level_sc=1
        [ducked_music];
        [voice][ducked_music]amix=inputs=2:duration=first:weights=1 {config.music_level}[aout]
        """

        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", music_path,
            "-filter_complex", filter_complex.replace("\n", ""),
            "-map", "0:v",
            "-map", "[aout]",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "256k",
            output_path
        ]

        return run_ffmpeg(cmd, "Applying sidechain ducking")

    def duck_with_envelope(
        self,
        video_path: str,
        music_path: str,
        output_path: str
    ) -> bool:
        """Duck music based on voice envelope detection."""

        config = self.config

        # Alternative approach using volume envelope
        filter_complex = f"""
        [0:a]aresample=48000,
             aformat=sample_fmts=fltp:channel_layouts=stereo[voice];
        [1:a]aresample=48000,
             aformat=sample_fmts=fltp:channel_layouts=stereo,
             volume={config.normal_music_level}[music];
        [voice]asplit[v1][v2];
        [v1]silencedetect=n=-30dB:d=0.3[voice_detect];
        [music][voice_detect]sidechaincompress=
            threshold=0.02:
            ratio={config.ratio}:
            attack={config.attack_ms}:
            release={config.release_ms}[ducked];
        [v2][ducked]amix=inputs=2:duration=first[aout]
        """

        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", music_path,
            "-filter_complex", filter_complex.replace("\n", ""),
            "-map", "0:v",
            "-map", "[aout]",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "256k",
            output_path
        ]

        return run_ffmpeg(cmd, "Applying envelope-based ducking")

    def duck_simple(
        self,
        video_path: str,
        music_path: str,
        output_path: str,
        voice_volume: float = 1.0,
        music_volume: float = 0.3
    ) -> bool:
        """Simple mixing with fixed volumes (no dynamic ducking)."""

        filter_complex = f"""
        [0:a]volume={voice_volume}[voice];
        [1:a]volume={music_volume}[music];
        [voice][music]amix=inputs=2:duration=first:dropout_transition=3[aout]
        """

        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", music_path,
            "-filter_complex", filter_complex.replace("\n", ""),
            "-map", "0:v",
            "-map", "[aout]",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "256k",
            output_path
        ]

        return run_ffmpeg(cmd, "Simple audio mixing")


class AudioMixer:
    """Multi-track audio mixing."""

    def mix_tracks(
        self,
        video_path: str,
        tracks: List[AudioTrack],
        output_path: str,
        keep_original: bool = True
    ) -> bool:
        """Mix multiple audio tracks with video."""

        inputs = ["-i", video_path]
        for track in tracks:
            inputs.extend(["-i", track.path])

        # Build filter complex
        filter_parts = []
        track_labels = []

        # Process original video audio if keeping
        if keep_original:
            filter_parts.append("[0:a]volume=1.0[orig]")
            track_labels.append("[orig]")

        # Process each additional track
        for i, track in enumerate(tracks):
            idx = i + 1  # Account for video input
            label = f"[t{i}]"

            parts = [f"[{idx}:a]"]

            # Apply delay if specified
            if track.delay_ms > 0:
                parts.append(f"adelay={track.delay_ms}|{track.delay_ms}")

            # Apply volume
            parts.append(f"volume={track.volume}")

            # Apply fade in/out
            if track.fade_in > 0:
                parts.append(f"afade=t=in:st=0:d={track.fade_in}")
            if track.fade_out > 0:
                parts.append(f"afade=t=out:st=0:d={track.fade_out}")

            # Apply pan
            if track.pan != 0:
                left = 1.0 - max(0, track.pan)
                right = 1.0 + min(0, track.pan)
                parts.append(f"pan=stereo|c0={left}*c0|c1={right}*c1")

            filter_parts.append(",".join(parts) + label)
            track_labels.append(label)

        # Mix all tracks
        num_inputs = len(track_labels)
        mix_filter = "".join(track_labels) + f"amix=inputs={num_inputs}:duration=first:dropout_transition=3[aout]"
        filter_parts.append(mix_filter)

        filter_complex = ";".join(filter_parts)

        cmd = [
            "ffmpeg", "-y",
            *inputs,
            "-filter_complex", filter_complex,
            "-map", "0:v",
            "-map", "[aout]",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "256k",
            output_path
        ]

        return run_ffmpeg(cmd, f"Mixing {num_inputs} audio tracks")

    def mix_with_timing(
        self,
        video_path: str,
        audio_path: str,
        output_path: str,
        start_time: float = 0.0,
        volume: float = 1.0,
        loop: bool = False
    ) -> bool:
        """Add audio track starting at specific time."""

        delay_ms = int(start_time * 1000)

        if loop:
            # Loop audio to fill video duration
            filter_complex = f"""
            [1:a]aloop=loop=-1:size=2e+09,adelay={delay_ms}|{delay_ms},volume={volume}[music];
            [0:a][music]amix=inputs=2:duration=first[aout]
            """
        else:
            filter_complex = f"""
            [1:a]adelay={delay_ms}|{delay_ms},volume={volume}[music];
            [0:a][music]amix=inputs=2:duration=first[aout]
            """

        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-filter_complex", filter_complex.replace("\n", ""),
            "-map", "0:v",
            "-map", "[aout]",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "256k",
            output_path
        ]

        return run_ffmpeg(cmd, f"Adding audio at {start_time}s")


class AudioNormalizer:
    """Audio normalization and loudness processing."""

    def normalize_loudness(
        self,
        input_path: str,
        output_path: str,
        target_lufs: float = -16.0,
        target_tp: float = -1.5,
        target_lra: float = 11.0
    ) -> bool:
        """Normalize audio to broadcast loudness standard (EBU R128)."""

        # Two-pass loudness normalization
        # Pass 1: Measure
        cmd_measure = [
            "ffmpeg", "-i", input_path,
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
            "-f", "null", "-"
        ]

        print("📏 Measuring loudness...")
        result = subprocess.run(cmd_measure, capture_output=True, text=True)

        # Parse loudness measurements from stderr
        measured = {}
        try:
            # Find JSON block in output
            stderr = result.stderr
            json_start = stderr.rfind("{")
            json_end = stderr.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = stderr[json_start:json_end]
                measured = json.loads(json_str)
        except:
            print("⚠️  Could not parse loudness data, using single-pass")

        if measured:
            # Pass 2: Apply normalization with measured values
            filter_str = (
                f"loudnorm=I={target_lufs}:TP={target_tp}:LRA={target_lra}:"
                f"measured_I={measured.get('input_i', -24)}:"
                f"measured_TP={measured.get('input_tp', -2)}:"
                f"measured_LRA={measured.get('input_lra', 7)}:"
                f"measured_thresh={measured.get('input_thresh', -34)}:"
                f"offset={measured.get('target_offset', 0)}:linear=true"
            )
        else:
            # Single pass
            filter_str = f"loudnorm=I={target_lufs}:TP={target_tp}:LRA={target_lra}"

        # Check if input is video or audio only
        has_video = False
        probe_cmd = ["ffprobe", "-v", "quiet", "-show_streams", input_path]
        probe_result = subprocess.run(probe_cmd, capture_output=True, text=True)
        has_video = "codec_type=video" in probe_result.stdout

        if has_video:
            cmd = [
                "ffmpeg", "-y",
                "-i", input_path,
                "-af", filter_str,
                "-c:v", "copy",
                "-c:a", "aac", "-b:a", "256k",
                output_path
            ]
        else:
            cmd = [
                "ffmpeg", "-y",
                "-i", input_path,
                "-af", filter_str,
                "-c:a", "aac", "-b:a", "256k",
                output_path
            ]

        return run_ffmpeg(cmd, f"Normalizing to {target_lufs} LUFS")

    def normalize_peak(
        self,
        input_path: str,
        output_path: str,
        target_db: float = -1.0
    ) -> bool:
        """Normalize audio to peak level."""

        # Detect current peak
        cmd_detect = [
            "ffmpeg", "-i", input_path,
            "-af", "volumedetect",
            "-f", "null", "-"
        ]

        result = subprocess.run(cmd_detect, capture_output=True, text=True)

        max_volume = 0
        for line in result.stderr.split("\n"):
            if "max_volume:" in line:
                try:
                    max_volume = float(line.split("max_volume:")[1].split()[0])
                except:
                    pass

        adjustment = target_db - max_volume

        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-af", f"volume={adjustment}dB",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "256k",
            output_path
        ]

        return run_ffmpeg(cmd, f"Normalizing peak to {target_db}dB (adjustment: {adjustment:+.1f}dB)")


class AudioProcessor:
    """Audio effects and processing."""

    def apply_compression(
        self,
        input_path: str,
        output_path: str,
        threshold_db: float = -20,
        ratio: float = 4,
        attack_ms: float = 20,
        release_ms: float = 250
    ) -> bool:
        """Apply dynamic range compression."""

        filter_str = (
            f"acompressor=threshold={threshold_db}dB:"
            f"ratio={ratio}:"
            f"attack={attack_ms}:"
            f"release={release_ms}:"
            f"makeup=2"
        )

        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-af", filter_str,
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "256k",
            output_path
        ]

        return run_ffmpeg(cmd, "Applying compression")

    def apply_eq(
        self,
        input_path: str,
        output_path: str,
        preset: str = "voice"
    ) -> bool:
        """Apply EQ preset."""

        presets = {
            "voice": "highpass=f=80,lowpass=f=12000,equalizer=f=200:t=h:w=200:g=-3,equalizer=f=3000:t=h:w=1000:g=3",
            "music": "equalizer=f=60:t=h:w=50:g=2,equalizer=f=10000:t=h:w=2000:g=2",
            "podcast": "highpass=f=100,lowpass=f=10000,acompressor=threshold=-20dB:ratio=3:attack=20:release=250",
            "warm": "equalizer=f=100:t=h:w=100:g=3,equalizer=f=8000:t=h:w=2000:g=-2",
            "bright": "equalizer=f=100:t=h:w=100:g=-2,equalizer=f=5000:t=h:w=2000:g=3"
        }

        filter_str = presets.get(preset, presets["voice"])

        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-af", filter_str,
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "256k",
            output_path
        ]

        return run_ffmpeg(cmd, f"Applying {preset} EQ")

    def remove_noise(
        self,
        input_path: str,
        output_path: str,
        noise_reduction_db: float = 12
    ) -> bool:
        """Apply noise reduction (simple high-pass + gate)."""

        # Basic noise reduction using highpass and noise gate
        filter_str = f"highpass=f=80,agate=threshold=0.01:ratio=2:attack=25:release=100"

        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-af", filter_str,
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "256k",
            output_path
        ]

        return run_ffmpeg(cmd, "Applying noise reduction")


def main():
    parser = argparse.ArgumentParser(
        description="Audio Ducking and Mixing Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Auto-duck music under dialogue
    python audio_mixer.py duck --video interview.mp4 --music background.mp3 -o output.mp4

    # Simple mix with fixed volumes
    python audio_mixer.py mix-simple --video video.mp4 --music music.mp3 --voice-vol 1.0 --music-vol 0.3 -o output.mp4

    # Mix multiple tracks
    python audio_mixer.py mix --video video.mp4 --tracks dialogue.wav music.mp3 sfx.wav -o output.mp4

    # Normalize to broadcast standard
    python audio_mixer.py normalize --video input.mp4 --target -16 -o output.mp4

    # Replace audio entirely
    python audio_mixer.py replace --video input.mp4 --audio new_audio.wav -o output.mp4

    # Apply EQ preset
    python audio_mixer.py eq --video input.mp4 --preset voice -o output.mp4

    # Add compression
    python audio_mixer.py compress --video input.mp4 --threshold -20 --ratio 4 -o output.mp4
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Duck command
    duck_parser = subparsers.add_parser("duck", help="Duck music under dialogue")
    duck_parser.add_argument("--video", "-v", required=True, help="Input video with dialogue")
    duck_parser.add_argument("--music", "-m", required=True, help="Music track to duck")
    duck_parser.add_argument("--threshold", type=float, default=0.03, help="Voice detection threshold")
    duck_parser.add_argument("--ratio", type=float, default=4.0, help="Ducking ratio")
    duck_parser.add_argument("--attack", type=int, default=200, help="Attack time (ms)")
    duck_parser.add_argument("--release", type=int, default=1000, help="Release time (ms)")
    duck_parser.add_argument("-o", "--output", default="ducked.mp4", help="Output file")

    # Mix simple command
    mix_simple_parser = subparsers.add_parser("mix-simple", help="Simple mix with fixed volumes")
    mix_simple_parser.add_argument("--video", "-v", required=True, help="Input video")
    mix_simple_parser.add_argument("--music", "-m", required=True, help="Music track")
    mix_simple_parser.add_argument("--voice-vol", type=float, default=1.0, help="Voice volume")
    mix_simple_parser.add_argument("--music-vol", type=float, default=0.3, help="Music volume")
    mix_simple_parser.add_argument("-o", "--output", default="mixed.mp4", help="Output file")

    # Mix command
    mix_parser = subparsers.add_parser("mix", help="Mix multiple tracks")
    mix_parser.add_argument("--video", "-v", required=True, help="Input video")
    mix_parser.add_argument("--tracks", nargs="+", required=True, help="Audio tracks to mix")
    mix_parser.add_argument("--volumes", nargs="+", type=float, help="Volume for each track")
    mix_parser.add_argument("--no-original", action="store_true", help="Don't include original audio")
    mix_parser.add_argument("-o", "--output", default="mixed.mp4", help="Output file")

    # Normalize command
    norm_parser = subparsers.add_parser("normalize", help="Normalize audio loudness")
    norm_parser.add_argument("--video", "-v", required=True, help="Input file")
    norm_parser.add_argument("--target", type=float, default=-16.0, help="Target LUFS")
    norm_parser.add_argument("--peak", action="store_true", help="Use peak normalization instead")
    norm_parser.add_argument("-o", "--output", default="normalized.mp4", help="Output file")

    # Replace command
    replace_parser = subparsers.add_parser("replace", help="Replace video audio")
    replace_parser.add_argument("--video", "-v", required=True, help="Input video")
    replace_parser.add_argument("--audio", "-a", required=True, help="New audio track")
    replace_parser.add_argument("-o", "--output", default="replaced.mp4", help="Output file")

    # EQ command
    eq_parser = subparsers.add_parser("eq", help="Apply EQ preset")
    eq_parser.add_argument("--video", "-v", required=True, help="Input file")
    eq_parser.add_argument("--preset", choices=["voice", "music", "podcast", "warm", "bright"], default="voice")
    eq_parser.add_argument("-o", "--output", default="eq.mp4", help="Output file")

    # Compress command
    comp_parser = subparsers.add_parser("compress", help="Apply compression")
    comp_parser.add_argument("--video", "-v", required=True, help="Input file")
    comp_parser.add_argument("--threshold", type=float, default=-20, help="Threshold (dB)")
    comp_parser.add_argument("--ratio", type=float, default=4, help="Compression ratio")
    comp_parser.add_argument("-o", "--output", default="compressed.mp4", help="Output file")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    success = False

    if args.command == "duck":
        config = DuckingConfig(
            threshold=args.threshold,
            ratio=args.ratio,
            attack_ms=args.attack,
            release_ms=args.release
        )
        ducker = AudioDucker(config)
        success = ducker.duck_with_sidechain(args.video, args.music, args.output)

    elif args.command == "mix-simple":
        ducker = AudioDucker()
        success = ducker.duck_simple(
            args.video, args.music, args.output,
            voice_volume=args.voice_vol, music_volume=args.music_vol
        )

    elif args.command == "mix":
        volumes = args.volumes or [1.0] * len(args.tracks)
        tracks = [
            AudioTrack(path=p, volume=v)
            for p, v in zip(args.tracks, volumes)
        ]
        mixer = AudioMixer()
        success = mixer.mix_tracks(
            args.video, tracks, args.output,
            keep_original=not args.no_original
        )

    elif args.command == "normalize":
        normalizer = AudioNormalizer()
        if args.peak:
            success = normalizer.normalize_peak(args.video, args.output, args.target)
        else:
            success = normalizer.normalize_loudness(args.video, args.output, args.target)

    elif args.command == "replace":
        cmd = [
            "ffmpeg", "-y",
            "-i", args.video,
            "-i", args.audio,
            "-map", "0:v",
            "-map", "1:a",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "256k",
            "-shortest",
            args.output
        ]
        success = run_ffmpeg(cmd, "Replacing audio")

    elif args.command == "eq":
        processor = AudioProcessor()
        success = processor.apply_eq(args.video, args.output, args.preset)

    elif args.command == "compress":
        processor = AudioProcessor()
        success = processor.apply_compression(
            args.video, args.output,
            threshold_db=args.threshold, ratio=args.ratio
        )

    if success:
        print(f"✅ Created: {args.output}")
    else:
        print("❌ Failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
