#!/usr/bin/env python3
"""
batch_processor.py - Parallel batch video processing

Features:
- Process multiple videos in parallel
- Platform-specific batch exports
- Progress tracking and logging
- Error handling and retries
- Resource management (CPU/GPU)

Usage:
    python batch_processor.py export youtube videos/*.mp4 -o exports/
    python batch_processor.py cut videos/*.mp4 --start 5 --end 60 -o trimmed/
    python batch_processor.py resize videos/*.mp4 --width 1920 --height 1080 -o resized/
"""

import argparse
import json
import multiprocessing
import os
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Callable, Dict, Any


@dataclass
class ProcessingJob:
    """Single video processing job"""
    input_file: Path
    output_file: Path
    operation: str
    params: Dict[str, Any]
    status: str = 'pending'  # pending, running, completed, failed
    error: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None


@dataclass
class BatchStats:
    """Batch processing statistics"""
    total: int = 0
    completed: int = 0
    failed: int = 0
    skipped: int = 0
    total_time: float = 0.0
    avg_time: float = 0.0


class BatchProcessor:
    """Parallel batch video processor"""

    def __init__(
        self,
        max_workers: Optional[int] = None,
        gpu_acceleration: bool = True,
        verbose: bool = False
    ):
        self.max_workers = max_workers or max(1, multiprocessing.cpu_count() - 1)
        self.gpu_acceleration = gpu_acceleration
        self.verbose = verbose
        self.jobs: List[ProcessingJob] = []
        self.stats = BatchStats()

    def add_job(self, job: ProcessingJob):
        """Add processing job to queue"""
        self.jobs.append(job)
        self.stats.total += 1

    def process_all(self, skip_existing: bool = True) -> BatchStats:
        """Process all jobs in parallel"""
        print(f"Processing {len(self.jobs)} videos with {self.max_workers} workers...")

        start_time = time.time()

        with ProcessPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {}

            for job in self.jobs:
                if skip_existing and job.output_file.exists():
                    job.status = 'skipped'
                    self.stats.skipped += 1
                    if self.verbose:
                        print(f"Skipping existing: {job.output_file}")
                    continue

                future = executor.submit(self._process_job, job)
                futures[future] = job

            for future in as_completed(futures):
                job = futures[future]
                try:
                    result = future.result()
                    if result.status == 'completed':
                        self.stats.completed += 1
                    else:
                        self.stats.failed += 1

                    self._print_progress()

                except Exception as e:
                    job.status = 'failed'
                    job.error = str(e)
                    self.stats.failed += 1
                    print(f"Error processing {job.input_file}: {e}")

        self.stats.total_time = time.time() - start_time
        self.stats.avg_time = self.stats.total_time / max(1, self.stats.completed)

        self._print_summary()

        return self.stats

    def _process_job(self, job: ProcessingJob) -> ProcessingJob:
        """Process single video job"""
        job.status = 'running'
        job.start_time = time.time()

        try:
            if job.operation == 'export':
                self._export_video(job)
            elif job.operation == 'cut':
                self._cut_video(job)
            elif job.operation == 'resize':
                self._resize_video(job)
            elif job.operation == 'convert':
                self._convert_video(job)
            elif job.operation == 'audio_extract':
                self._extract_audio(job)
            else:
                raise ValueError(f"Unknown operation: {job.operation}")

            job.status = 'completed'

        except Exception as e:
            job.status = 'failed'
            job.error = str(e)

        finally:
            job.end_time = time.time()

        return job

    def _export_video(self, job: ProcessingJob):
        """Export video for platform"""
        platform = job.params['platform']
        quality = job.params.get('quality', 'high')

        presets = {
            'youtube': {
                'resolution': '1920x1080',
                'fps': 30,
                'crf': {'draft': 28, 'medium': 23, 'high': 18},
                'preset': {'draft': 'ultrafast', 'medium': 'medium', 'high': 'slow'},
                'audio_bitrate': '192k'
            },
            'instagram_story': {
                'resolution': '1080x1920',
                'fps': 30,
                'crf': {'draft': 28, 'medium': 23, 'high': 20},
                'preset': {'draft': 'ultrafast', 'medium': 'medium', 'high': 'medium'},
                'audio_bitrate': '128k',
                'max_duration': 15
            },
            'instagram_reel': {
                'resolution': '1080x1920',
                'fps': 30,
                'crf': {'draft': 28, 'medium': 23, 'high': 20},
                'preset': {'draft': 'ultrafast', 'medium': 'medium', 'high': 'medium'},
                'audio_bitrate': '128k',
                'max_duration': 90
            },
            'twitter': {
                'resolution': '1280x720',
                'fps': 30,
                'crf': {'draft': 28, 'medium': 23, 'high': 20},
                'preset': {'draft': 'ultrafast', 'medium': 'medium', 'high': 'medium'},
                'audio_bitrate': '128k',
                'maxrate': '5000k',
                'bufsize': '10000k'
            },
            'tiktok': {
                'resolution': '1080x1920',
                'fps': 30,
                'crf': {'draft': 28, 'medium': 23, 'high': 20},
                'preset': {'draft': 'ultrafast', 'medium': 'medium', 'high': 'medium'},
                'audio_bitrate': '128k'
            }
        }

        config = presets[platform]

        cmd = [
            'ffmpeg', '-y',
            '-i', str(job.input_file),
            '-c:v', 'libx264',
            '-preset', config['preset'][quality],
            '-crf', str(config['crf'][quality]),
            '-s', config['resolution'],
            '-r', str(config['fps']),
            '-pix_fmt', 'yuv420p',
            '-color_primaries', 'bt709',
            '-color_trc', 'bt709',
            '-colorspace', 'bt709',
            '-movflags', '+faststart',
            '-c:a', 'aac',
            '-b:a', config['audio_bitrate'],
            '-ar', '48000'
        ]

        if 'maxrate' in config:
            cmd += ['-maxrate', config['maxrate'], '-bufsize', config['bufsize']]

        if 'max_duration' in config:
            cmd += ['-t', str(config['max_duration'])]

        cmd.append(str(job.output_file))

        self._run_ffmpeg(cmd)

    def _cut_video(self, job: ProcessingJob):
        """Cut/trim video"""
        start = job.params['start']
        end = job.params.get('end')

        cmd = [
            'ffmpeg', '-y',
            '-ss', str(max(0, start - 2)),
            '-i', str(job.input_file),
            '-ss', '2'
        ]

        if end:
            duration = end - start
            cmd += ['-t', str(duration)]

        cmd += [
            '-c:v', 'libx264',
            '-crf', '18',
            '-preset', 'medium',
            '-c:a', 'aac',
            '-b:a', '192k',
            str(job.output_file)
        ]

        self._run_ffmpeg(cmd)

    def _resize_video(self, job: ProcessingJob):
        """Resize video"""
        width = job.params.get('width')
        height = job.params.get('height')

        if width and height:
            scale = f"{width}:{height}"
        elif width:
            scale = f"{width}:-2"
        elif height:
            scale = f"-2:{height}"
        else:
            raise ValueError("Must specify width and/or height")

        cmd = [
            'ffmpeg', '-y',
            '-i', str(job.input_file),
            '-vf', f"scale={scale}",
            '-c:v', 'libx264',
            '-crf', '18',
            '-preset', 'medium',
            '-c:a', 'copy',
            str(job.output_file)
        ]

        self._run_ffmpeg(cmd)

    def _convert_video(self, job: ProcessingJob):
        """Convert video format"""
        codec = job.params.get('codec', 'libx264')
        quality = job.params.get('quality', 18)

        cmd = [
            'ffmpeg', '-y',
            '-i', str(job.input_file),
            '-c:v', codec,
            '-crf', str(quality),
            '-preset', 'medium',
            '-c:a', 'aac',
            '-b:a', '192k',
            str(job.output_file)
        ]

        self._run_ffmpeg(cmd)

    def _extract_audio(self, job: ProcessingJob):
        """Extract audio from video"""
        audio_format = job.params.get('format', 'mp3')
        bitrate = job.params.get('bitrate', '192k')

        cmd = [
            'ffmpeg', '-y',
            '-i', str(job.input_file),
            '-vn',  # No video
            '-c:a', 'libmp3lame' if audio_format == 'mp3' else 'aac',
            '-b:a', bitrate,
            str(job.output_file)
        ]

        self._run_ffmpeg(cmd)

    def _run_ffmpeg(self, cmd: List[str]):
        """Run FFmpeg command with error handling"""
        if self.verbose:
            print(f"Running: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False
        )

        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg failed: {result.stderr}")

    def _print_progress(self):
        """Print current progress"""
        processed = self.stats.completed + self.stats.failed
        total = self.stats.total - self.stats.skipped

        if total > 0:
            percent = (processed / total) * 100
            print(f"Progress: {processed}/{total} ({percent:.1f}%) - "
                  f"Completed: {self.stats.completed}, Failed: {self.stats.failed}")

    def _print_summary(self):
        """Print final summary"""
        print("\n" + "="*60)
        print("BATCH PROCESSING COMPLETE")
        print("="*60)
        print(f"Total jobs:      {self.stats.total}")
        print(f"Completed:       {self.stats.completed}")
        print(f"Failed:          {self.stats.failed}")
        print(f"Skipped:         {self.stats.skipped}")
        print(f"Total time:      {self.stats.total_time:.1f}s")
        print(f"Avg time/video:  {self.stats.avg_time:.1f}s")
        print("="*60)

        if self.stats.failed > 0:
            print("\nFailed jobs:")
            for job in self.jobs:
                if job.status == 'failed':
                    print(f"  - {job.input_file}: {job.error}")


def main():
    parser = argparse.ArgumentParser(description='Batch video processor')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    parser.add_argument('-w', '--workers', type=int, help='Max parallel workers')
    parser.add_argument('--no-gpu', action='store_true', help='Disable GPU acceleration')
    parser.add_argument('--overwrite', action='store_true', help='Overwrite existing files')

    subparsers = parser.add_subparsers(dest='command', required=True)

    # Export command
    export_parser = subparsers.add_parser('export', help='Batch export for platform')
    export_parser.add_argument('platform', choices=[
        'youtube', 'instagram_story', 'instagram_reel', 'twitter', 'tiktok'
    ])
    export_parser.add_argument('inputs', nargs='+', help='Input video files (or glob pattern)')
    export_parser.add_argument('-o', '--output-dir', required=True, help='Output directory')
    export_parser.add_argument('-q', '--quality', choices=['draft', 'medium', 'high'],
                                default='high', help='Export quality')

    # Cut command
    cut_parser = subparsers.add_parser('cut', help='Batch cut/trim')
    cut_parser.add_argument('inputs', nargs='+', help='Input video files')
    cut_parser.add_argument('-s', '--start', type=float, required=True, help='Start time (seconds)')
    cut_parser.add_argument('-e', '--end', type=float, help='End time (seconds)')
    cut_parser.add_argument('-o', '--output-dir', required=True, help='Output directory')

    # Resize command
    resize_parser = subparsers.add_parser('resize', help='Batch resize')
    resize_parser.add_argument('inputs', nargs='+', help='Input video files')
    resize_parser.add_argument('--width', type=int, help='Target width')
    resize_parser.add_argument('--height', type=int, help='Target height')
    resize_parser.add_argument('-o', '--output-dir', required=True, help='Output directory')

    # Convert command
    convert_parser = subparsers.add_parser('convert', help='Batch format conversion')
    convert_parser.add_argument('inputs', nargs='+', help='Input video files')
    convert_parser.add_argument('-f', '--format', default='mp4', help='Output format')
    convert_parser.add_argument('-c', '--codec', default='libx264', help='Video codec')
    convert_parser.add_argument('-q', '--quality', type=int, default=18, help='CRF quality')
    convert_parser.add_argument('-o', '--output-dir', required=True, help='Output directory')

    # Extract audio command
    audio_parser = subparsers.add_parser('audio', help='Batch audio extraction')
    audio_parser.add_argument('inputs', nargs='+', help='Input video files')
    audio_parser.add_argument('-f', '--format', default='mp3', choices=['mp3', 'aac', 'wav'])
    audio_parser.add_argument('-b', '--bitrate', default='192k', help='Audio bitrate')
    audio_parser.add_argument('-o', '--output-dir', required=True, help='Output directory')

    args = parser.parse_args()

    # Expand glob patterns
    input_files = []
    for pattern in args.inputs:
        input_files.extend(Path('.').glob(pattern))

    if not input_files:
        print("No input files found", file=sys.stderr)
        sys.exit(1)

    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Create processor
    processor = BatchProcessor(
        max_workers=args.workers,
        gpu_acceleration=not args.no_gpu,
        verbose=args.verbose
    )

    # Create jobs
    for input_file in input_files:
        input_path = Path(input_file)

        if args.command == 'export':
            output_file = output_dir / f"{input_path.stem}_{args.platform}.mp4"
            job = ProcessingJob(
                input_file=input_path,
                output_file=output_file,
                operation='export',
                params={'platform': args.platform, 'quality': args.quality}
            )

        elif args.command == 'cut':
            output_file = output_dir / f"{input_path.stem}_cut.mp4"
            job = ProcessingJob(
                input_file=input_path,
                output_file=output_file,
                operation='cut',
                params={'start': args.start, 'end': args.end}
            )

        elif args.command == 'resize':
            output_file = output_dir / f"{input_path.stem}_resized.mp4"
            job = ProcessingJob(
                input_file=input_path,
                output_file=output_file,
                operation='resize',
                params={'width': args.width, 'height': args.height}
            )

        elif args.command == 'convert':
            output_file = output_dir / f"{input_path.stem}.{args.format}"
            job = ProcessingJob(
                input_file=input_path,
                output_file=output_file,
                operation='convert',
                params={'codec': args.codec, 'quality': args.quality}
            )

        elif args.command == 'audio':
            output_file = output_dir / f"{input_path.stem}.{args.format}"
            job = ProcessingJob(
                input_file=input_path,
                output_file=output_file,
                operation='audio_extract',
                params={'format': args.format, 'bitrate': args.bitrate}
            )

        processor.add_job(job)

    # Process all jobs
    stats = processor.process_all(skip_existing=not args.overwrite)

    # Exit with error if any jobs failed
    if stats.failed > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
