# Timeline Editing Reference

Multi-track timeline editing concepts and FFmpeg implementation.

## Timeline Concepts

### Video Track Structure

```
Timeline:
├── Video Track 1 (Primary footage)
├── Video Track 2 (Overlay/B-roll)
├── Video Track 3 (Graphics/Text)
├── Audio Track 1 (Dialogue)
├── Audio Track 2 (Music)
└── Audio Track 3 (Sound effects)
```

### In/Out Points

```bash
# Each clip has:
# - IN point:  Where the clip starts on timeline
# - OUT point: Where the clip ends on timeline
# - SRC IN:    Where to start reading from source
# - SRC OUT:   Where to stop reading from source

# Example: Place 5s of source (from 10s-15s) at timeline position 30s
ffmpeg -i source.mp4 -ss 10 -t 5 -i bg.mp4 \
  -filter_complex "[1:v][0:v]overlay=enable='between(t,30,35)'[out]" \
  -map "[out]" output.mp4
```

## Multi-Track Video Composition

### Layering Videos (Overlay)

```bash
# Layer video2 over video1 (picture-in-picture)
ffmpeg -i background.mp4 -i overlay.mp4 -filter_complex \
  "[1:v]scale=320:240[pip]; \
   [0:v][pip]overlay=W-w-10:H-h-10:enable='between(t,5,15)'[out]" \
  -map "[out]" -map 0:a \
  output.mp4

# enable='between(t,5,15)': Only show overlay from 5s to 15s
```

### Split Screen

```bash
# Side-by-side (2 videos)
ffmpeg -i left.mp4 -i right.mp4 -filter_complex \
  "[0:v]scale=960:1080[left]; \
   [1:v]scale=960:1080[right]; \
   [left][right]hstack[out]" \
  -map "[out]" output.mp4

# Top/bottom split
ffmpeg -i top.mp4 -i bottom.mp4 -filter_complex \
  "[0:v]scale=1920:540[top]; \
   [1:v]scale=1920:540[bottom]; \
   [top][bottom]vstack[out]" \
  -map "[out]" output.mp4

# 2x2 Grid
ffmpeg -i v1.mp4 -i v2.mp4 -i v3.mp4 -i v4.mp4 -filter_complex \
  "[0:v]scale=960:540[v1]; \
   [1:v]scale=960:540[v2]; \
   [2:v]scale=960:540[v3]; \
   [3:v]scale=960:540[v4]; \
   [v1][v2]hstack[top]; \
   [v3][v4]hstack[bottom]; \
   [top][bottom]vstack[out]" \
  -map "[out]" output.mp4
```

### Insert Edit (Non-destructive)

```bash
# Insert clip B into clip A at specific point
# A: 0-60s, insert B (10s) at A's 30s mark
# Result: A[0-30], B[0-10], A[30-60]

# Step 1: Split clip A
ffmpeg -i A.mp4 -t 30 -c copy A_part1.mp4
ffmpeg -i A.mp4 -ss 30 -c copy A_part2.mp4

# Step 2: Concatenate with insert
echo "file 'A_part1.mp4'" > list.txt
echo "file 'B.mp4'" >> list.txt
echo "file 'A_part2.mp4'" >> list.txt

ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4
```

### Overwrite Edit

```bash
# Replace segment of clip A with clip B
# A: 0-60s, overwrite 20-30s with B (10s)
# Result: A[0-20], B[0-10], A[30-60]

ffmpeg -i A.mp4 -i B.mp4 -filter_complex \
  "[0:v]trim=0:20,setpts=PTS-STARTPTS[v1]; \
   [1:v]trim=0:10,setpts=PTS-STARTPTS[v2]; \
   [0:v]trim=30:60,setpts=PTS-STARTPTS[v3]; \
   [v1][v2][v3]concat=n=3:v=1[out]" \
  -map "[out]" output.mp4
```

## Multi-Track Audio

### Audio Layering

```bash
# Mix multiple audio tracks with individual volume control
ffmpeg -i video.mp4 -i dialogue.wav -i music.mp3 -i sfx.wav \
  -filter_complex \
  "[1:a]volume=1.0[dlg]; \
   [2:a]volume=0.3[mus]; \
   [3:a]volume=0.5[sfx]; \
   [dlg][mus][sfx]amix=inputs=3:duration=first[aout]" \
  -map 0:v -map "[aout]" \
  -c:v copy -c:a aac -b:a 256k \
  output.mp4
```

### Audio with Timeline Positioning

```bash
# Position audio at specific timeline points
ffmpeg -i video.mp4 -i sfx1.wav -i sfx2.wav -filter_complex \
  "[1:a]adelay=5000|5000[sfx1]; \
   [2:a]adelay=12000|12000[sfx2]; \
   [0:a][sfx1][sfx2]amix=inputs=3:duration=first[aout]" \
  -map 0:v -map "[aout]" \
  output.mp4

# adelay values are in milliseconds
# adelay=5000|5000 = delay 5s on left and right channels
```

### Ducking (Lower music when dialogue plays)

```bash
# Automatic ducking using sidechaincompress
ffmpeg -i video.mp4 -i music.mp3 -filter_complex \
  "[0:a]asplit[voice][duck_trigger]; \
   [1:a][duck_trigger]sidechaincompress=threshold=0.1:ratio=10:attack=100:release=1000[ducked_music]; \
   [voice][ducked_music]amix=inputs=2:duration=first[aout]" \
  -map 0:v -map "[aout]" \
  output.mp4
```

## Keyframe Animation

### Position Animation

```bash
# Move overlay from left to right over 5 seconds
ffmpeg -i bg.mp4 -i overlay.png -filter_complex \
  "[1:v]scale=200:200[ovr]; \
   [0:v][ovr]overlay=x='min(t*100,W-200)':y=100[out]" \
  -map "[out]" -t 10 output.mp4

# x='min(t*100,W-200)': Move 100 pixels/second until reaching right edge
```

### Opacity Animation

```bash
# Fade overlay in/out
ffmpeg -i bg.mp4 -i overlay.png -filter_complex \
  "[1:v]format=rgba,fade=in:st=0:d=1:alpha=1,fade=out:st=4:d=1:alpha=1[ovr]; \
   [0:v][ovr]overlay=10:10[out]" \
  -map "[out]" output.mp4

# Fade in from 0-1s, fade out from 4-5s
```

### Scale Animation (Zoom)

```bash
# Zoom effect (Ken Burns)
ffmpeg -i photo.jpg -filter_complex \
  "zoompan=z='min(1.5,zoom+0.001)':d=300:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080" \
  -c:v libx264 -t 10 output.mp4

# z='min(1.5,zoom+0.001)': Slowly zoom to 1.5x
# d=300: 300 frames duration (10s at 30fps)
```

## Time Remapping

### Speed Changes

```bash
# 2x speed (fast forward)
ffmpeg -i input.mp4 -filter:v "setpts=0.5*PTS" -filter:a "atempo=2.0" output.mp4

# 0.5x speed (slow motion)
ffmpeg -i input.mp4 -filter:v "setpts=2.0*PTS" -filter:a "atempo=0.5" output.mp4

# Variable speed (speed ramp)
# Slow from 0-5s, normal 5-10s, fast 10-15s
ffmpeg -i input.mp4 -filter_complex \
  "[0:v]trim=0:5,setpts=2*PTS[slow]; \
   [0:v]trim=5:10,setpts=PTS-STARTPTS[normal]; \
   [0:v]trim=10:15,setpts=0.5*PTS-STARTPTS[fast]; \
   [slow][normal][fast]concat=n=3:v=1[out]" \
  -map "[out]" output.mp4
```

### Reverse

```bash
# Reverse video
ffmpeg -i input.mp4 -vf reverse output.mp4

# Reverse segment
ffmpeg -i input.mp4 -filter_complex \
  "[0:v]trim=5:10,setpts=PTS-STARTPTS,reverse[rev]; \
   [0:v]trim=0:5,setpts=PTS-STARTPTS[before]; \
   [0:v]trim=10:20,setpts=PTS-STARTPTS[after]; \
   [before][rev][after]concat=n=3:v=1[out]" \
  -map "[out]" output.mp4
```

### Frame Hold (Freeze Frame)

```bash
# Freeze at 5 seconds for 3 seconds
ffmpeg -i input.mp4 -filter_complex \
  "[0:v]trim=0:5[before]; \
   [0:v]trim=5:5.033,loop=90:1:0[freeze]; \
   [0:v]trim=5:,setpts=PTS-STARTPTS+3/TB[after]; \
   [before][freeze][after]concat=n=3:v=1[out]" \
  -map "[out]" output.mp4

# loop=90:1:0 = 90 frames loop (3s at 30fps)
```

## Markers and Sync Points

### Scene Detection for Auto-Markers

```bash
# Detect scene changes (potential cut points)
ffmpeg -i input.mp4 -filter:v "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep pts_time

# Output timestamps where scene changes occur (threshold 0.3)
```

### Audio Sync with Clapboard

```bash
# Find audio spike (clap) for sync
ffmpeg -i input.mp4 -af "silencedetect=n=-30dB:d=0.5" -f null - 2>&1 | grep silence_end

# This detects when silence ends (loud sound begins)
```

### Align Two Clips by Audio

```bash
# Step 1: Generate audio fingerprints
# (Requires external tool like sync-audio-tracks or Praat)

# Step 2: Apply calculated offset
ffmpeg -i video1.mp4 -itsoffset 0.250 -i video2.mp4 \
  -map 0:v -map 1:a \
  -c:v copy -c:a aac \
  synced_output.mp4
```

## Complex Timeline Example

```bash
# Full multi-track edit:
# - Background video (0-60s)
# - B-roll insert (at 10-20s)
# - Lower third graphic (at 5-8s)
# - Dialogue audio (continuous)
# - Music bed (ducked, 30% volume)

ffmpeg \
  -i main.mp4 \
  -i broll.mp4 \
  -i lowerthird.png \
  -i music.mp3 \
  -filter_complex \
  "
  [0:v]trim=0:10,setpts=PTS-STARTPTS[main1];
  [1:v]trim=0:10,setpts=PTS-STARTPTS[broll];
  [0:v]trim=20:60,setpts=PTS-STARTPTS[main2];
  [main1][broll][main2]concat=n=3:v=1[base];

  [2:v]format=rgba,fade=in:st=0:d=0.5:alpha=1,fade=out:st=2.5:d=0.5:alpha=1[lt];
  [base][lt]overlay=0:H-150:enable='between(t,5,8)'[video];

  [0:a]volume=1.0[dialogue];
  [3:a]volume=0.3[music];
  [dialogue][music]amix=inputs=2:duration=first[audio]
  " \
  -map "[video]" -map "[audio]" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k \
  final_edit.mp4
```

## Best Practices

1. **Plan your timeline on paper first** - Draw out tracks, timing, transitions
2. **Use intermediate files for complex edits** - Don't try to do everything in one command
3. **Match frame rates before combining** - Avoid judder from mismatched FPS
4. **Keep audio and video sync** - Always test playback at multiple points
5. **Use setpts=PTS-STARTPTS after trim** - Reset timestamps to avoid gaps
6. **Label your filter chains** - Use descriptive names like `[dialogue]` not `[a1]`

---

This reference covers timeline editing concepts. For transitions between clips, see the main SKILL.md. For export settings, see `export-optimization.md`.
