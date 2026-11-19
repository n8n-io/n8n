---
name: video-processing-editing
description: FFmpeg automation for cutting, trimming, concatenating videos. Audio mixing, timeline editing, transitions, effects. Export optimization for YouTube, social media. Subtitle handling, color
  grading, batch processing. Use for videogen projects, content creation, automated video production. Activate on "video editing", "FFmpeg", "trim video", "concatenate", "transitions", "export optimization".
  NOT for real-time video editing UI, 3D compositing, or motion graphics.
allowed-tools: Read,Write,Edit,Bash(ffmpeg*,ffprobe*,python*)
metadata:
  tags:
  - video
  - processing
  - editing
  - video-editing
  - ffmpeg
  pairs-with:
  - skill: ai-video-production-master
    reason: AI-generated video clips need FFmpeg post-processing for trimming, concatenation, and export
  - skill: voice-audio-engineer
    reason: Audio tracks for video require voice synthesis, mixing, and synchronization
  - skill: sound-engineer
    reason: Video sound design and audio mixing use spatial audio and effects processing techniques
---

# Video Processing & Editing

Expert in FFmpeg-based video editing, processing automation, and export optimization for modern content creation workflows.

## When to Use

✅ **Use for**:
- Automated video editing pipelines (script-to-video)
- Cutting, trimming, concatenating clips
- Adding transitions, effects, overlays
- Audio mixing and normalization
- Subtitle/caption handling
- Export optimization for platforms
- Batch video processing
- Color grading and correction

❌ **NOT for**:
- Real-time video editing UI (use DaVinci Resolve/Premiere)
- 3D compositing (use After Effects/Blender)
- Motion graphics animation (use After Effects)
- Basic screen recording (use OBS)

---

## Technology Selection

### Video Editing Tools

| Tool | Speed | Features | Use Case |
|------|-------|----------|----------|
| FFmpeg | Very Fast | CLI automation | Production pipelines |
| MoviePy | Medium | Python API | Programmatic editing |
| PyAV | Fast | Low-level control | Custom processing |
| DaVinci Resolve | Slow | Full NLE | Manual editing |

**Decision tree**:
```
Need automation? → FFmpeg
Need Python API? → MoviePy
Need frame-level control? → PyAV
Need manual editing? → DaVinci Resolve
```

---

## Common Anti-Patterns

### Anti-Pattern 1: Not Using Keyframe-Aligned Cuts

**Novice thinking**: "Just cut the video at any timestamp"

**Problem**: Causes artifacts, black frames, and playback issues.

**Wrong approach**:
```bash
# ❌ Cut at arbitrary timestamp (not keyframe-aligned)
ffmpeg -i input.mp4 -ss 00:01:23.456 -to 00:02:45.678 -c copy output.mp4

# Result: Black frames, artifacts, sync issues
```

**Why wrong**:
- Video codecs use keyframes (I-frames) every 2-10 seconds
- Non-keyframe cuts require re-encoding
- Using `-c copy` (stream copy) without keyframe alignment breaks playback
- GOP (Group of Pictures) structure depends on keyframes

**Correct approach 1**: Re-encode for precise cuts
```bash
# ✅ Re-encode for frame-accurate cutting
ffmpeg -i input.mp4 -ss 00:01:23.456 -to 00:02:45.678 \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k \
  output.mp4

# Frame-accurate, but slower (re-encoding)
```

**Correct approach 2**: Keyframe-aligned stream copy
```bash
# ✅ Fast cutting with keyframe alignment
# Step 1: Find keyframes near cut points
ffprobe -select_streams v -show_frames -show_entries frame=pkt_pts_time,key_frame \
  -of csv input.mp4 | grep ",1$" | awk -F',' '{print $2}'

# Step 2: Cut at nearest keyframes (fast, no re-encoding)
ffmpeg -i input.mp4 -ss 00:01:22.000 -to 00:02:46.000 -c copy output.mp4

# Blazing fast, no quality loss, but not frame-accurate
```

**Correct approach 3**: Two-pass for best of both worlds
```bash
# ✅ Fast seek + precise cut
ffmpeg -ss 00:01:20.000 -i input.mp4 \
  -ss 00:00:03.456 -to 00:01:25.678 \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k \
  output.mp4

# -ss BEFORE -i: Fast seek to keyframe (no decode)
# -ss AFTER -i: Precise trim (only decode needed portion)
```

**Performance comparison**:
| Method | Time (1-hour video) | Accuracy | Quality |
|--------|---------------------|----------|---------|
| Stream copy (arbitrary) | 2s | ❌ Broken | ❌ Artifacts |
| Stream copy (keyframe) | 2s | ±2s | ✅ Perfect |
| Re-encode (simple) | 15min | ✅ Frame | ⚠️ Quality loss |
| Two-pass (optimal) | 3min | ✅ Frame | ✅ Perfect |

**Timeline context**:
- 2010: FFmpeg required full re-encoding for cuts
- 2015: `-c copy` added for stream copying
- 2020: Two-pass cutting became best practice
- 2024: Hardware acceleration (NVENC) makes re-encoding viable

---

### Anti-Pattern 2: Re-encoding Unnecessarily

**Novice thinking**: "Apply all edits in one FFmpeg command"

**Problem**: Multiple re-encodings cause cumulative quality loss.

**Wrong approach**:
```bash
# ❌ Re-encode for each operation (quality degradation)
# Operation 1: Trim
ffmpeg -i input.mp4 -ss 00:01:00 -to 00:05:00 \
  -c:v libx264 -crf 23 temp1.mp4

# Operation 2: Add audio
ffmpeg -i temp1.mp4 -i audio.mp3 -c:v libx264 -crf 23 \
  -map 0:v -map 1:a temp2.mp4

# Operation 3: Add subtitles
ffmpeg -i temp2.mp4 -vf subtitles=subs.srt \
  -c:v libx264 -crf 23 output.mp4

# Result: 3x re-encoding = significant quality loss
```

**Why wrong**:
- Each re-encode is lossy (even with high CRF)
- Cumulative quality loss (generation loss)
- 3x encoding time
- Wasted disk I/O

**Correct approach 1**: Chain operations in single command
```bash
# ✅ Single-pass encoding with all operations
ffmpeg -ss 00:01:00 -i input.mp4 -i audio.mp3 \
  -to 00:04:00 \
  -vf "subtitles=subs.srt" \
  -map 0:v -map 1:a \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k \
  output.mp4

# Single re-encode, all operations applied at once
```

**Correct approach 2**: Use stream copy when possible
```bash
# ✅ Lossless operations with stream copy
# Trim (stream copy)
ffmpeg -i input.mp4 -ss 00:01:00 -to 00:05:00 -c copy temp.mp4

# Add audio (stream copy video, encode audio)
ffmpeg -i temp.mp4 -i audio.mp3 \
  -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 192k \
  temp2.mp4

# Burn subtitles (must re-encode video)
ffmpeg -i temp2.mp4 -vf subtitles=subs.srt \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4

# Only 1 video re-encode (for subtitles)
```

**Quality comparison**:
| Method | Encoding Passes | Quality (VMAF) | Time |
|--------|-----------------|----------------|------|
| 3x re-encode (CRF 23) | 3 | 82/100 | 45min |
| Single pass (CRF 23) | 1 | 91/100 | 15min |
| Stream copy + 1 encode | 1 | 95/100 | 18min |
| All stream copy | 0 | 100/100 | 30s |

---

### Anti-Pattern 3: Ignoring Color Space Conversions

**Novice thinking**: "Just concatenate videos together"

**Problem**: Color shifts, mismatched brightness, broken playback.

**Wrong approach**:
```bash
# ❌ Concatenate videos with different color spaces
# clip1.mp4: BT.709 (HD), yuv420p
# clip2.mp4: BT.601 (SD), yuvj420p (full range)
# clip3.mp4: BT.2020 (HDR), yuv420p10le

# Create concat list
echo "file 'clip1.mp4'" > list.txt
echo "file 'clip2.mp4'" >> list.txt
echo "file 'clip3.mp4'" >> list.txt

# Concatenate without color normalization
ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4

# Result: Color shifts between clips, broken HDR metadata
```

**Why wrong**:
- Different color spaces (BT.601 vs BT.709 vs BT.2020)
- Different pixel formats (yuv420p vs yuvj420p)
- Different color ranges (limited vs full)
- Metadata conflicts

**Correct approach**:
```bash
# ✅ Normalize color space before concatenation

# Step 1: Analyze color space of each clip
ffprobe -v error -select_streams v:0 \
  -show_entries stream=color_space,color_transfer,color_primaries,pix_fmt \
  -of default=noprint_wrappers=1 clip1.mp4

# Step 2: Normalize all clips to common color space
# Target: BT.709 (HD), yuv420p, limited range

# Normalize clip1 (already BT.709)
ffmpeg -i clip1.mp4 -c copy clip1_normalized.mp4

# Normalize clip2 (BT.601 SD → BT.709 HD)
ffmpeg -i clip2.mp4 \
  -vf "scale=in_range=full:out_range=limited,colorspace=bt709:iall=bt601:fast=1" \
  -color_primaries bt709 \
  -color_trc bt709 \
  -colorspace bt709 \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  clip2_normalized.mp4

# Normalize clip3 (BT.2020 HDR → BT.709 SDR)
ffmpeg -i clip3.mp4 \
  -vf "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=limited,format=yuv420p" \
  -color_primaries bt709 \
  -color_trc bt709 \
  -colorspace bt709 \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  clip3_normalized.mp4

# Step 3: Concatenate normalized clips
echo "file 'clip1_normalized.mp4'" > list.txt
echo "file 'clip2_normalized.mp4'" >> list.txt
echo "file 'clip3_normalized.mp4'" >> list.txt

ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4
```

**Color space guide**:
| Standard | Color Space | Transfer | Primaries | Use Case |
|----------|-------------|----------|-----------|----------|
| BT.601 | SD | bt470bg | bt470bg | Old SD content |
| BT.709 | HD | bt709 | bt709 | Modern HD/FHD |
| BT.2020 | UHD/HDR | smpte2084 | bt2020 | 4K HDR |
| sRGB | Web | iec61966-2-1 | bt709 | Web delivery |

---

### Anti-Pattern 4: Poor Audio Sync

**Novice thinking**: "Video and audio are separate, just overlay them"

**Problem**: Lip sync issues, audio drift, broken playback.

**Wrong approach**:
```bash
# ❌ Replace audio without sync consideration
ffmpeg -i video.mp4 -i audio.mp3 \
  -map 0:v -map 1:a \
  -c:v copy -c:a copy \
  output.mp4

# Problems:
# - Audio duration ≠ video duration
# - No audio stretching/compression
# - Drift over time
```

**Why wrong**:
- Audio and video have different durations
- No timebase synchronization
- No drift correction
- Ignores original audio sync

**Correct approach 1**: Stretch/compress audio to match video
```bash
# ✅ Adjust audio speed to match video duration

# Get durations
VIDEO_DUR=$(ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 video.mp4)
AUDIO_DUR=$(ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 audio.mp3)

# Calculate speed ratio
RATIO=$(echo "$VIDEO_DUR / $AUDIO_DUR" | bc -l)

# Stretch audio to match video (with pitch correction)
ffmpeg -i video.mp4 -i audio.mp3 \
  -filter_complex "[1:a]atempo=${RATIO}[a]" \
  -map 0:v -map "[a]" \
  -c:v copy -c:a aac -b:a 192k \
  output.mp4
```

**Correct approach 2**: Precise offset and trim
```bash
# ✅ Sync audio with offset and trim

# Audio starts 0.5s late, trim to match video
ffmpeg -i video.mp4 -itsoffset 0.5 -i audio.mp3 \
  -map 0:v -map 1:a \
  -shortest \
  -c:v copy -c:a aac -b:a 192k \
  output.mp4

# -itsoffset: Delay audio by 0.5s
# -shortest: Trim to shortest stream
```

**Correct approach 3**: Mix multiple audio tracks with sync
```bash
# ✅ Mix dialogue, music, effects with precise timing

ffmpeg -i video.mp4 -i dialogue.wav -i music.mp3 -i sfx.wav \
  -filter_complex "
    [1:a]adelay=0|0[dlg];
    [2:a]volume=0.3,adelay=500|500[mus];
    [3:a]adelay=1200|1200[sfx];
    [dlg][mus][sfx]amix=inputs=3:duration=first[a]
  " \
  -map 0:v -map "[a]" \
  -c:v copy -c:a aac -b:a 256k \
  output.mp4

# adelay: Precise millisecond timing
# amix: Mix multiple audio streams
# volume: Normalize levels
```

**Audio sync checklist**:
```
□ Verify video and audio durations match
□ Use -shortest to prevent excess audio
□ Apply adelay for precise timing offsets
□ Use atempo for speed adjustment (maintains pitch)
□ Set audio bitrate appropriately (128k-256k)
□ Test lip sync at beginning, middle, end
```

---

### Anti-Pattern 5: Wrong Codec/Bitrate for Platform

**Novice thinking**: "One export settings for everything"

**Problem**: Wasted bandwidth, poor quality, rejected uploads, compatibility issues.

**Wrong approach**:
```bash
# ❌ Export everything at 4K 50 Mbps
ffmpeg -i input.mp4 \
  -c:v libx264 -b:v 50M -s 3840x2160 \
  -c:a aac -b:a 320k \
  output.mp4

# For Instagram story: 2 GB file, rejected (max 100 MB)
# For YouTube: Could use 10 Mbps and look identical
# For Twitter: Exceeds bitrate limits
```

**Why wrong**:
- Platform-specific size/bitrate limits
- Over-encoding wastes bandwidth
- Wrong resolution for platform
- Incompatible codecs

**Correct approach**: Platform-optimized exports

**YouTube (recommended settings)**:
```bash
# ✅ YouTube 1080p upload
ffmpeg -i input.mp4 \
  -c:v libx264 -preset slow -crf 18 \
  -s 1920x1080 -r 30 \
  -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -movflags +faststart \
  -c:a aac -b:a 192k -ar 48000 \
  youtube_1080p.mp4

# YouTube 4K upload
ffmpeg -i input.mp4 \
  -c:v libx264 -preset slow -crf 18 \
  -s 3840x2160 -r 60 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 256k -ar 48000 \
  youtube_4k.mp4
```

**Instagram (Stories, Reels, Feed)**:
```bash
# ✅ Instagram Story (9:16, max 100 MB, 15s)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1080x1920 -r 30 -t 15 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  instagram_story.mp4

# ✅ Instagram Reel (9:16, max 90s)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1080x1920 -r 30 -t 90 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  instagram_reel.mp4

# ✅ Instagram Feed (1:1 or 4:5)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1080x1080 -r 30 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  instagram_feed.mp4
```

**Twitter/X**:
```bash
# ✅ Twitter video (max 512 MB, 2:20)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1280x720 -r 30 -t 140 \
  -maxrate 5000k -bufsize 10000k \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  twitter.mp4
```

**TikTok**:
```bash
# ✅ TikTok (9:16, max 287 MB, 10 min)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1080x1920 -r 30 -t 600 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  tiktok.mp4
```

**Web (HTML5 video)**:
```bash
# ✅ Web optimized (fast load, broad compatibility)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1920x1080 -r 30 \
  -pix_fmt yuv420p \
  -profile:v baseline -level 3.0 \
  -movflags +faststart \
  -c:a aac -b:a 128k -ar 48000 \
  web.mp4
```

**Platform specs table**:
| Platform | Max Size | Max Duration | Resolution | FPS | Bitrate | Codec |
|----------|----------|--------------|------------|-----|---------|-------|
| YouTube | Unlimited | Unlimited | 8K | 60 | Auto | H.264/VP9 |
| Instagram Story | 100 MB | 15s | 1080x1920 | 30 | ~5 Mbps | H.264 |
| Instagram Reel | 1 GB | 90s | 1080x1920 | 30 | ~8 Mbps | H.264 |
| Twitter | 512 MB | 2:20 | 1920x1080 | 60 | 5 Mbps | H.264 |
| TikTok | 287 MB | 10min | 1080x1920 | 30 | ~4 Mbps | H.264 |
| LinkedIn | 5 GB | 10min | 1920x1080 | 30 | 5 Mbps | H.264 |
| Web | Varies | Varies | 1920x1080 | 30 | 2-5 Mbps | H.264 |

**Export optimization checklist**:
```
□ Use -movflags +faststart for web (progressive download)
□ Use -pix_fmt yuv420p for broad compatibility
□ Set -r 30 for most platforms (avoid variable framerate)
□ Use -preset slow for final exports (better quality)
□ Use -preset ultrafast for drafts
□ Apply -maxrate and -bufsize for streaming
□ Test playback on target platform before bulk export
```

---

## Production Checklist

```
□ Align cuts to keyframes (or two-pass seek)
□ Chain operations in single FFmpeg command
□ Normalize color spaces before concatenating
□ Verify audio/video sync (test at multiple points)
□ Use platform-specific export presets
□ Apply -movflags +faststart for web delivery
□ Set proper color metadata (bt709 for HD)
□ Test output file on target platform
□ Keep lossless intermediate files (ProRes, FFV1)
□ Use hardware acceleration for batch jobs (NVENC, VideoToolbox)
```

---

## When to Use vs Avoid

| Scenario | Appropriate? |
|----------|--------------|
| Automated video pipeline (script → video) | ✅ Yes - FFmpeg automation |
| Batch process 100 videos | ✅ Yes - parallel FFmpeg jobs |
| Trim/cut clips programmatically | ✅ Yes - precise cutting |
| Add subtitles to videos | ✅ Yes - burn or soft subs |
| Color grade footage | ⚠️ Limited - basic only |
| Multi-cam editing | ❌ No - use DaVinci Resolve |
| Motion graphics | ❌ No - use After Effects |
| Real-time preview editing | ❌ No - use Premiere/Resolve |

---

## References

- `/references/ffmpeg-guide.md` - Complete FFmpeg command reference
- `/references/timeline-editing.md` - Timeline concepts, multi-track editing
- `/references/export-optimization.md` - Platform-specific export settings

## Scripts

- `scripts/video_editor.py` - Cut, trim, concatenate, transitions, effects
- `scripts/batch_processor.py` - Parallel batch video processing

---

**This skill guides**: Video editing | FFmpeg | Timeline editing | Transitions | Export optimization | Audio mixing | Color grading | Automated video production
