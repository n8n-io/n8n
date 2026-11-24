# FFmpeg Complete Reference Guide

Comprehensive FFmpeg command reference for video processing and editing.

## Essential Commands

### Basic Conversion

```bash
# Convert format (auto settings)
ffmpeg -i input.mp4 output.avi

# Convert with specific codec
ffmpeg -i input.mp4 -c:v libx264 -c:a aac output.mp4

# Copy streams without re-encoding (fast)
ffmpeg -i input.mp4 -c copy output.mp4
```

### Cutting and Trimming

```bash
# Cut from start time, specific duration
ffmpeg -i input.mp4 -ss 00:01:30 -t 00:00:30 output.mp4

# Cut from start to end time
ffmpeg -i input.mp4 -ss 00:01:00 -to 00:05:00 output.mp4

# Two-pass cutting (fast + accurate)
ffmpeg -ss 00:01:00 -i input.mp4 -ss 00:00:05 -t 00:01:30 -c:v libx264 -crf 18 output.mp4
```

### Quality Control

```bash
# CRF (Constant Rate Factor) - recommended
# Lower = better quality, larger file
# 18 = visually lossless, 23 = high quality, 28 = acceptable
ffmpeg -i input.mp4 -c:v libx264 -crf 18 output.mp4

# Two-pass encoding (best quality for target size)
ffmpeg -i input.mp4 -c:v libx264 -b:v 2M -pass 1 -f null /dev/null
ffmpeg -i input.mp4 -c:v libx264 -b:v 2M -pass 2 output.mp4

# Preset (speed vs compression)
# ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
ffmpeg -i input.mp4 -c:v libx264 -preset slow -crf 18 output.mp4
```

### Resolution and Scaling

```bash
# Scale to specific resolution
ffmpeg -i input.mp4 -vf scale=1920:1080 output.mp4

# Scale maintaining aspect ratio
ffmpeg -i input.mp4 -vf scale=1920:-2 output.mp4  # width=1920, height=auto (even)
ffmpeg -i input.mp4 -vf scale=-2:1080 output.mp4  # height=1080, width=auto

# Scale with high-quality algorithm
ffmpeg -i input.mp4 -vf scale=1920:1080:flags=lanczos output.mp4
```

### Frame Rate

```bash
# Change frame rate
ffmpeg -i input.mp4 -r 30 output.mp4

# Slow motion (interpolate frames)
ffmpeg -i input.mp4 -filter:v "minterpolate='fps=60:mi_mode=mci'" output.mp4

# Speed up video
ffmpeg -i input.mp4 -filter:v "setpts=0.5*PTS" output.mp4  # 2x speed
```

### Audio Operations

```bash
# Extract audio
ffmpeg -i input.mp4 -vn -c:a copy audio.aac

# Remove audio
ffmpeg -i input.mp4 -an output.mp4

# Replace audio
ffmpeg -i video.mp4 -i audio.mp3 -c:v copy -c:a aac -map 0:v -map 1:a output.mp4

# Mix audio (50/50)
ffmpeg -i video.mp4 -i audio.mp3 -filter_complex "[0:a][1:a]amix=inputs=2[a]" -map 0:v -map "[a]" output.mp4

# Adjust audio volume
ffmpeg -i input.mp4 -af "volume=2.0" output.mp4  # 2x louder
ffmpeg -i input.mp4 -af "volume=0.5" output.mp4  # half volume

# Normalize audio
ffmpeg -i input.mp4 -af "loudnorm=I=-16:TP=-1.5:LRA=11" output.mp4
```

### Concatenation

```bash
# Create concat file
echo "file 'video1.mp4'" > list.txt
echo "file 'video2.mp4'" >> list.txt
echo "file 'video3.mp4'" >> list.txt

# Concatenate (must have same codec/resolution)
ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4

# Concatenate with re-encoding (different formats)
ffmpeg -f concat -safe 0 -i list.txt -c:v libx264 -crf 18 output.mp4

# Concatenate specific segments
ffmpeg -i input.mp4 -filter_complex \
  "[0:v]trim=0:5,setpts=PTS-STARTPTS[v1]; \
   [0:v]trim=10:15,setpts=PTS-STARTPTS[v2]; \
   [v1][v2]concat=n=2:v=1[out]" \
  -map "[out]" output.mp4
```

### Subtitles

```bash
# Burn subtitles into video
ffmpeg -i input.mp4 -vf subtitles=subs.srt output.mp4

# Add soft subtitles (MP4)
ffmpeg -i input.mp4 -i subs.srt -c copy -c:s mov_text output.mp4

# Add soft subtitles (MKV)
ffmpeg -i input.mp4 -i subs.srt -c copy -c:s srt output.mkv

# Style burned subtitles
ffmpeg -i input.mp4 -vf "subtitles=subs.srt:force_style='FontName=Arial,FontSize=24,PrimaryColour=&H00FFFF'" output.mp4
```

### Cropping and Padding

```bash
# Crop video (remove edges)
ffmpeg -i input.mp4 -vf "crop=1920:800:0:140" output.mp4
# Format: crop=width:height:x:y

# Auto-detect crop (remove black bars)
ffmpeg -i input.mp4 -vf "cropdetect=24:16:0" -f null -
# Use detected values in actual crop

# Add padding (letterbox/pillarbox)
ffmpeg -i input.mp4 -vf "pad=1920:1080:0:100:black" output.mp4
# Format: pad=width:height:x:y:color
```

### Filters (Video Effects)

```bash
# Brightness/Contrast
ffmpeg -i input.mp4 -vf "eq=brightness=0.1:contrast=1.2" output.mp4

# Saturation
ffmpeg -i input.mp4 -vf "eq=saturation=1.5" output.mp4

# Gamma correction
ffmpeg -i input.mp4 -vf "eq=gamma=1.2" output.mp4

# Sharpen
ffmpeg -i input.mp4 -vf "unsharp=5:5:1.0" output.mp4

# Blur
ffmpeg -i input.mp4 -vf "boxblur=5:1" output.mp4

# Denoise
ffmpeg -i input.mp4 -vf "hqdn3d=4:3:6:4.5" output.mp4

# Deinterlace
ffmpeg -i input.mp4 -vf "yadif=0:-1:0" output.mp4

# Rotate
ffmpeg -i input.mp4 -vf "rotate=45*PI/180" output.mp4  # 45 degrees
ffmpeg -i input.mp4 -vf "transpose=1" output.mp4  # 90 degrees clockwise

# Flip
ffmpeg -i input.mp4 -vf "hflip" output.mp4  # horizontal
ffmpeg -i input.mp4 -vf "vflip" output.mp4  # vertical
```

### Overlays and Watermarks

```bash
# Add watermark (top-left)
ffmpeg -i input.mp4 -i logo.png -filter_complex "overlay=10:10" output.mp4

# Add watermark (bottom-right with padding)
ffmpeg -i input.mp4 -i logo.png -filter_complex "overlay=W-w-10:H-h-10" output.mp4

# Fade in watermark
ffmpeg -i input.mp4 -i logo.png -filter_complex \
  "[1:v]fade=in:st=0:d=1:alpha=1[logo]; \
   [0:v][logo]overlay=W-w-10:H-h-10" output.mp4

# Add text overlay
ffmpeg -i input.mp4 -vf "drawtext=text='Hello World':fontfile=/path/to/font.ttf:fontsize=24:fontcolor=white:x=10:y=10" output.mp4
```

### Transitions

```bash
# Crossfade between two videos
ffmpeg -i video1.mp4 -i video2.mp4 -filter_complex \
  "[0:v][1:v]xfade=transition=fade:duration=1:offset=5" output.mp4

# Available transitions:
# fade, fadeblack, fadewhite, distance, wipeleft, wiperight,
# wipeup, wipedown, slideleft, slideright, slideup, slidedown,
# circlecrop, rectcrop, circleclose, circleopen, dissolve
```

### Color Grading

```bash
# Convert to grayscale
ffmpeg -i input.mp4 -vf "hue=s=0" output.mp4

# Adjust hue
ffmpeg -i input.mp4 -vf "hue=h=90" output.mp4  # shift hue by 90 degrees

# Color temperature (warm)
ffmpeg -i input.mp4 -vf "eq=brightness=0.02:saturation=1.1,hue=h=10" output.mp4

# Color temperature (cool)
ffmpeg -i input.mp4 -vf "eq=brightness=-0.02:saturation=1.1,hue=h=-10" output.mp4

# Vintage/sepia look
ffmpeg -i input.mp4 -vf "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131" output.mp4

# High contrast B&W
ffmpeg -i input.mp4 -vf "hue=s=0,eq=contrast=1.5:brightness=0.1" output.mp4
```

### Color Space Conversion

```bash
# SDR to HDR (basic)
ffmpeg -i input.mp4 -vf "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt2020:t=smpte2084:m=bt2020nc:r=full,format=yuv420p10le" output.mp4

# HDR to SDR (tonemap)
ffmpeg -i input.mp4 -vf "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=limited,format=yuv420p" output.mp4

# BT.601 to BT.709 (SD to HD)
ffmpeg -i input.mp4 -vf "scale=in_range=full:out_range=limited,colorspace=bt709:iall=bt601:fast=1" \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 output.mp4
```

### Encoding Presets

```bash
# YouTube 1080p
ffmpeg -i input.mp4 \
  -c:v libx264 -preset slow -crf 18 \
  -s 1920x1080 -r 30 \
  -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -movflags +faststart \
  -c:a aac -b:a 192k -ar 48000 \
  youtube.mp4

# Instagram Story (9:16)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1080x1920 -r 30 -t 15 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  instagram_story.mp4

# Twitter (720p, 2:20 max)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1280x720 -r 30 -t 140 \
  -maxrate 5000k -bufsize 10000k \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  twitter.mp4

# Web (HTML5 compatible)
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -s 1920x1080 -r 30 \
  -pix_fmt yuv420p \
  -profile:v baseline -level 3.0 \
  -movflags +faststart \
  -c:a aac -b:a 128k -ar 48000 \
  web.mp4
```

### Hardware Acceleration

```bash
# NVIDIA NVENC (GPU encoding)
ffmpeg -hwaccel cuda -i input.mp4 \
  -c:v h264_nvenc -preset slow -crf 18 \
  output.mp4

# Apple VideoToolbox (Mac)
ffmpeg -i input.mp4 \
  -c:v h264_videotoolbox -b:v 5M \
  output.mp4

# Intel Quick Sync (QSV)
ffmpeg -hwaccel qsv -i input.mp4 \
  -c:v h264_qsv -preset slow -global_quality 18 \
  output.mp4

# AMD VCE
ffmpeg -i input.mp4 \
  -c:v h264_amf -quality quality -rc cqp -qp_i 18 -qp_p 18 \
  output.mp4
```

### Advanced Filters

```bash
# Stabilization (two-pass)
# Pass 1: Analyze
ffmpeg -i input.mp4 -vf vidstabdetect=shakiness=10:accuracy=15 -f null -

# Pass 2: Transform
ffmpeg -i input.mp4 -vf vidstabtransform=smoothing=30:input="transforms.trf" output.mp4

# Picture-in-picture
ffmpeg -i main.mp4 -i pip.mp4 -filter_complex \
  "[1:v]scale=320:240[pip]; \
   [0:v][pip]overlay=W-w-10:H-h-10" output.mp4

# Side-by-side comparison
ffmpeg -i video1.mp4 -i video2.mp4 -filter_complex \
  "[0:v]scale=iw/2:ih[left]; \
   [1:v]scale=iw/2:ih[right]; \
   [left][right]hstack" output.mp4

# Grid layout (2x2)
ffmpeg -i v1.mp4 -i v2.mp4 -i v3.mp4 -i v4.mp4 -filter_complex \
  "[0:v][1:v]hstack[top]; \
   [2:v][3:v]hstack[bottom]; \
   [top][bottom]vstack" output.mp4
```

### Metadata

```bash
# View metadata
ffmpeg -i input.mp4 -f ffmetadata metadata.txt

# Remove all metadata
ffmpeg -i input.mp4 -map_metadata -1 -c copy output.mp4

# Add metadata
ffmpeg -i input.mp4 -metadata title="My Video" -metadata author="John Doe" -c copy output.mp4

# Rotate metadata (without re-encoding)
ffmpeg -i input.mp4 -metadata:s:v rotate=90 -c copy output.mp4
```

### Stream Mapping

```bash
# Extract specific stream
ffmpeg -i input.mp4 -map 0:0 video_only.mp4  # First stream
ffmpeg -i input.mp4 -map 0:a audio_only.aac  # All audio streams

# Combine specific streams from multiple files
ffmpeg -i video.mp4 -i audio.mp3 -i subs.srt \
  -map 0:v -map 1:a -map 2:s \
  -c:v copy -c:a copy -c:s mov_text \
  output.mp4

# Exclude specific stream
ffmpeg -i input.mp4 -map 0 -map -0:s -c copy output.mp4  # Remove subtitles
```

### Thumbnail Generation

```bash
# Extract single frame
ffmpeg -i input.mp4 -ss 00:00:05 -frames:v 1 thumbnail.jpg

# Extract multiple frames (every 10 seconds)
ffmpeg -i input.mp4 -vf "select='not(mod(n\,300))'" -vsync 0 frames/frame_%04d.jpg

# Generate thumbnails grid
ffmpeg -i input.mp4 -vf "select='not(mod(n\,300))',scale=320:240,tile=4x3" grid.jpg
```

### Analysis and Probing

```bash
# Get video info (JSON)
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4

# Get duration
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.mp4

# Get resolution
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 input.mp4

# Get frame rate
ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=noprint_wrappers=1:nokey=1 input.mp4

# Detect black frames
ffmpeg -i input.mp4 -vf "blackdetect=d=0.5:pix_th=0.10" -f null -

# Detect scene changes
ffmpeg -i input.mp4 -vf "select='gt(scene,0.4)',showinfo" -f null -

# Find keyframes
ffprobe -select_streams v -show_frames -show_entries frame=pkt_pts_time,key_frame -of csv input.mp4 | grep ",1$"
```

### Performance Tips

```bash
# Use fastest settings for drafts
ffmpeg -i input.mp4 -c:v libx264 -preset ultrafast -crf 28 draft.mp4

# Multi-threaded encoding
ffmpeg -i input.mp4 -c:v libx264 -threads 8 -preset medium -crf 18 output.mp4

# Limit memory usage
ffmpeg -i input.mp4 -c:v libx264 -bufsize 2M -maxrate 2M output.mp4

# Stream copy when possible (no re-encoding)
ffmpeg -i input.mp4 -ss 10 -t 60 -c copy output.mp4
```

## Common Codecs

### Video Codecs

| Codec | Library | Quality | Speed | Use Case |
|-------|---------|---------|-------|----------|
| H.264 | libx264 | Excellent | Fast | General purpose, web |
| H.265 | libx265 | Excellent | Slow | 4K, high compression |
| VP9 | libvpx-vp9 | Excellent | Slow | Web, YouTube |
| AV1 | libaom-av1 | Best | Very Slow | Future-proof, best compression |
| ProRes | prores | Lossless | Fast | Editing, intermediate |
| DNxHD | dnxhd | Lossless | Fast | Editing, intermediate |

### Audio Codecs

| Codec | Library | Quality | Bitrate | Use Case |
|-------|---------|---------|---------|----------|
| AAC | aac | Excellent | 128-256k | General purpose |
| MP3 | libmp3lame | Good | 128-320k | Universal compatibility |
| Opus | libopus | Excellent | 64-128k | Web, low bitrate |
| FLAC | flac | Lossless | Variable | Archival |
| PCM | pcm_s16le | Lossless | 1411k | Editing |

## Pixel Formats

```bash
# yuv420p - Most compatible (8-bit, 4:2:0)
-pix_fmt yuv420p

# yuv420p10le - 10-bit HDR
-pix_fmt yuv420p10le

# yuv444p - Full chroma resolution (4:4:4)
-pix_fmt yuv444p

# rgb24 - RGB color space
-pix_fmt rgb24
```

## Error Handling

```bash
# Continue on errors
ffmpeg -err_detect ignore_err -i input.mp4 output.mp4

# Overwrite output files without asking
ffmpeg -y -i input.mp4 output.mp4

# Never overwrite
ffmpeg -n -i input.mp4 output.mp4

# Verbose output for debugging
ffmpeg -v verbose -i input.mp4 output.mp4

# Hide banner
ffmpeg -hide_banner -i input.mp4 output.mp4
```

## Best Practices

1. **Always use `-movflags +faststart`** for web videos (enables progressive download)
2. **Use two-pass encoding for specific file sizes**
3. **Prefer CRF over bitrate** for quality-based encoding
4. **Use `-preset slow`** for final exports (better compression)
5. **Use `-preset ultrafast`** for drafts (faster encoding)
6. **Always specify `-pix_fmt yuv420p`** for broad compatibility
7. **Set color metadata** when converting color spaces
8. **Use stream copy (`-c copy`)** when possible to avoid re-encoding
9. **Align cuts to keyframes** for stream copy operations
10. **Normalize color spaces** before concatenating clips

---

This guide covers 95% of common FFmpeg use cases. For more advanced operations, refer to the official FFmpeg documentation.
