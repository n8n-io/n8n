# Export Optimization Reference

Platform-specific export settings and optimization techniques.

## Platform Specifications (2024/2025)

### YouTube

| Setting | Recommended | Maximum |
|---------|-------------|---------|
| Resolution | 1920x1080 (1080p) | 7680x4320 (8K) |
| Frame Rate | 30 fps | 60 fps |
| Bitrate | Auto (CRF 18) | Unlimited |
| Max File Size | 256 GB | 256 GB |
| Max Duration | 12 hours | 12 hours |
| Container | MP4 | MP4, MOV, MKV |
| Video Codec | H.264 | H.264, H.265, VP9, AV1 |
| Audio | AAC 192kbps | AAC 384kbps |
| Color | BT.709 SDR | BT.2020 HDR |

```bash
# YouTube 1080p (standard)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset slow -crf 18 \
  -s 1920x1080 -r 30 \
  -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -movflags +faststart \
  -c:a aac -b:a 192k -ar 48000 \
  youtube_1080p.mp4

# YouTube 4K HDR
ffmpeg -i input.mp4 \
  -c:v libx265 -preset slow -crf 18 \
  -s 3840x2160 -r 60 \
  -pix_fmt yuv420p10le \
  -color_primaries bt2020 -color_trc smpte2084 -colorspace bt2020nc \
  -x265-params "hdr-opt=1:repeat-headers=1:colorprim=bt2020:transfer=smpte2084:colormatrix=bt2020nc:master-display=G(13250,34500)B(7500,3000)R(34000,16000)WP(15635,16450)L(10000000,1):max-cll=1000,400" \
  -movflags +faststart \
  -c:a aac -b:a 256k -ar 48000 \
  youtube_4k_hdr.mp4
```

### Instagram

**Stories**
| Setting | Requirement |
|---------|-------------|
| Resolution | 1080x1920 (9:16) |
| Frame Rate | 30 fps |
| Max Duration | 60 seconds |
| Max File Size | 250 MB |
| Video Codec | H.264 |
| Audio | AAC 128kbps |

**Reels**
| Setting | Requirement |
|---------|-------------|
| Resolution | 1080x1920 (9:16) |
| Frame Rate | 30 fps |
| Max Duration | 90 seconds |
| Max File Size | 4 GB |
| Video Codec | H.264 |
| Audio | AAC 128kbps |

**Feed**
| Setting | Requirement |
|---------|-------------|
| Resolution | 1080x1080 (1:1) or 1080x1350 (4:5) |
| Frame Rate | 30 fps |
| Max Duration | 60 minutes |
| Video Codec | H.264 |
| Audio | AAC 128kbps |

```bash
# Instagram Story
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1080x1920 -r 30 -t 60 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  instagram_story.mp4

# Instagram Reel
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1080x1920 -r 30 -t 90 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  instagram_reel.mp4

# Instagram Feed (4:5 portrait)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -vf "scale=1080:1350:force_original_aspect_ratio=decrease,pad=1080:1350:(ow-iw)/2:(oh-ih)/2" \
  -r 30 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  instagram_feed.mp4
```

### TikTok

| Setting | Requirement |
|---------|-------------|
| Resolution | 1080x1920 (9:16) |
| Frame Rate | 30 fps |
| Max Duration | 10 minutes |
| Max File Size | 287 MB (mobile), 1 GB (web) |
| Video Codec | H.264 |
| Audio | AAC 128kbps |
| Bitrate | 3-5 Mbps recommended |

```bash
# TikTok
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1080x1920 -r 30 -t 600 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  tiktok.mp4
```

### Twitter/X

| Setting | Requirement |
|---------|-------------|
| Resolution | 1920x1080 (16:9) or 1280x720 |
| Frame Rate | 30-60 fps |
| Max Duration | 2 minutes 20 seconds |
| Max File Size | 512 MB |
| Video Codec | H.264 |
| Max Bitrate | 25 Mbps |
| Audio | AAC, max 128kbps |

```bash
# Twitter/X
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1280x720 -r 30 -t 140 \
  -maxrate 5M -bufsize 10M \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  twitter.mp4
```

### LinkedIn

| Setting | Requirement |
|---------|-------------|
| Resolution | 1920x1080 (16:9) |
| Frame Rate | 30 fps |
| Max Duration | 10 minutes (native), 15 min (ads) |
| Max File Size | 5 GB |
| Video Codec | H.264 |
| Audio | AAC 128kbps |

```bash
# LinkedIn
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1920x1080 -r 30 -t 600 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  linkedin.mp4
```

### Facebook

| Setting | Requirement |
|---------|-------------|
| Resolution | 1920x1080 or 1080x1920 |
| Frame Rate | 30 fps |
| Max Duration | 240 minutes |
| Max File Size | 10 GB |
| Video Codec | H.264, H.265 |
| Audio | AAC, MP3 |

```bash
# Facebook (landscape)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1920x1080 -r 30 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  facebook.mp4

# Facebook Stories/Reels (vertical)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1080x1920 -r 30 -t 60 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  facebook_story.mp4
```

## Web Optimization

### HTML5 Video

```bash
# Maximum compatibility (works everywhere)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -profile:v baseline -level 3.0 \
  -s 1920x1080 -r 30 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k -ar 48000 \
  web_compatible.mp4
```

### Adaptive Bitrate Streaming (HLS)

```bash
# Generate HLS with multiple quality levels
ffmpeg -i input.mp4 \
  -filter_complex "[0:v]split=3[v1][v2][v3]" \
  -map "[v1]" -c:v:0 libx264 -b:v:0 5M -s:v:0 1920x1080 -profile:v:0 high \
  -map "[v2]" -c:v:1 libx264 -b:v:1 3M -s:v:1 1280x720 -profile:v:1 main \
  -map "[v3]" -c:v:2 libx264 -b:v:2 1M -s:v:2 854x480 -profile:v:2 baseline \
  -map 0:a -c:a aac -b:a 128k \
  -var_stream_map "v:0,a:0 v:1,a:0 v:2,a:0" \
  -master_pl_name master.m3u8 \
  -f hls -hls_time 6 -hls_list_size 0 \
  -hls_segment_filename "v%v/segment%d.ts" \
  v%v/playlist.m3u8
```

### WebM (VP9)

```bash
# WebM for modern browsers (smaller file size)
ffmpeg -i input.mp4 \
  -c:v libvpx-vp9 -crf 30 -b:v 0 \
  -s 1920x1080 -r 30 \
  -c:a libopus -b:a 128k \
  output.webm
```

## Compression Optimization

### Quality vs File Size

| CRF Value | Quality | Use Case |
|-----------|---------|----------|
| 17-18 | Visually lossless | Archival, mastering |
| 19-21 | High quality | YouTube, streaming |
| 22-23 | Good quality | Social media |
| 24-26 | Acceptable | Mobile, bandwidth-limited |
| 27-28 | Lower quality | Drafts, previews |

### Two-Pass Encoding (Target File Size)

```bash
# Target 50 MB file for 60s video
# Calculate bitrate: (50 MB * 8) / 60s = 6.67 Mbps
# Subtract audio: 6.67 - 0.128 = 6.54 Mbps video

# Pass 1
ffmpeg -i input.mp4 -c:v libx264 -b:v 6500k -pass 1 -f null /dev/null

# Pass 2
ffmpeg -i input.mp4 -c:v libx264 -b:v 6500k -pass 2 -c:a aac -b:a 128k output.mp4
```

### Preset Selection

| Preset | Speed | Compression | Use Case |
|--------|-------|-------------|----------|
| ultrafast | Very fast | Poor | Drafts, testing |
| superfast | Fast | Poor | Quick previews |
| veryfast | Fast | OK | Streaming, live |
| faster | Fast | OK | Quick exports |
| fast | Medium | Good | Balance |
| medium | Medium | Good | Default |
| slow | Slow | Better | Final export |
| slower | Very slow | Best | Final mastering |
| veryslow | Extremely slow | Best | Archive quality |

```bash
# Draft (fastest)
ffmpeg -i input.mp4 -c:v libx264 -preset ultrafast -crf 28 draft.mp4

# Final (best quality)
ffmpeg -i input.mp4 -c:v libx264 -preset veryslow -crf 18 final.mp4
```

## Progressive Download Optimization

### faststart for Web

```bash
# CRITICAL for web playback - moves moov atom to beginning
ffmpeg -i input.mp4 -c copy -movflags +faststart output.mp4

# For new encodes
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -movflags +faststart output.mp4
```

Without `-movflags +faststart`:
1. Browser downloads entire file
2. Finds moov atom at end
3. Only then can start playback

With `-movflags +faststart`:
1. Browser downloads beginning
2. Finds moov atom immediately
3. Playback starts instantly

## Batch Export Script

```bash
#!/bin/bash
# Export to all platforms at once

INPUT="$1"
BASENAME="${INPUT%.*}"

# YouTube 1080p
ffmpeg -i "$INPUT" \
  -c:v libx264 -preset slow -crf 18 \
  -s 1920x1080 -r 30 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 192k \
  "${BASENAME}_youtube.mp4"

# Instagram Reel
ffmpeg -i "$INPUT" \
  -c:v libx264 -preset medium -crf 23 \
  -s 1080x1920 -r 30 -t 90 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  "${BASENAME}_instagram.mp4"

# Twitter
ffmpeg -i "$INPUT" \
  -c:v libx264 -preset medium -crf 23 \
  -s 1280x720 -r 30 -t 140 \
  -maxrate 5M -bufsize 10M \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  "${BASENAME}_twitter.mp4"

# TikTok
ffmpeg -i "$INPUT" \
  -c:v libx264 -preset medium -crf 23 \
  -s 1080x1920 -r 30 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  "${BASENAME}_tiktok.mp4"

echo "Exports complete!"
```

## Hardware Acceleration

### NVIDIA NVENC

```bash
# NVENC encoding (10-20x faster than CPU)
ffmpeg -hwaccel cuda -i input.mp4 \
  -c:v h264_nvenc -preset p7 -rc:v vbr -cq:v 19 \
  -b:v 0 -s 1920x1080 \
  -c:a aac -b:a 192k \
  output.mp4

# Presets: p1 (fastest) to p7 (best quality)
# cq:v: Quality level (lower = better, 19 ≈ CRF 18)
```

### Apple VideoToolbox (macOS)

```bash
# VideoToolbox encoding (uses Apple Silicon/Intel GPU)
ffmpeg -i input.mp4 \
  -c:v h264_videotoolbox -q:v 60 \
  -s 1920x1080 \
  -c:a aac -b:a 192k \
  output.mp4

# q:v: Quality 1-100 (higher = better, 60 ≈ CRF 20)
```

### Intel Quick Sync

```bash
# QSV encoding
ffmpeg -hwaccel qsv -i input.mp4 \
  -c:v h264_qsv -preset slow -global_quality 20 \
  -s 1920x1080 \
  -c:a aac -b:a 192k \
  output.mp4
```

## Verification

### Check Output Quality

```bash
# Get VMAF score (requires libvmaf)
ffmpeg -i original.mp4 -i encoded.mp4 \
  -lavfi libvmaf="log_fmt=json:log_path=vmaf.json" \
  -f null -

# VMAF interpretation:
# 90+: Excellent (indistinguishable)
# 80-90: Good quality
# 70-80: Acceptable
# <70: Noticeable quality loss
```

### Check File Metadata

```bash
# Verify encoding settings
ffprobe -v error -show_format -show_streams output.mp4

# Check moov atom position (for faststart)
ffprobe -v trace output.mp4 2>&1 | grep -E "moov|mdat"
# moov should appear before mdat for faststart
```

### Check Platform Compatibility

```bash
# Verify H.264 profile and level
ffprobe -v error -select_streams v:0 \
  -show_entries stream=profile,level \
  -of default=noprint_wrappers=1 output.mp4

# For maximum compatibility:
# profile: Baseline or Main
# level: 3.0 or 3.1
```

---

This reference covers export optimization. For timeline concepts, see `timeline-editing.md`. For FFmpeg commands, see `ffmpeg-guide.md`.
