# Reading the source

A reel made from something says what that thing says and looks like it. The source is a tweet (an X post), a landing page, a YouTube video or a video file. `scripts/read-source.mjs` reads it into one folder; you finish two documents from it, `Source.md` (the words) and `Look.md` (the look), and the reel is made from those two and nothing else.

```bash
node scripts/read-source.mjs https://x.com/<handle>/status/<id> --out source --follow
node scripts/read-source.mjs https://example.com --out source
node scripts/read-source.mjs https://youtu.be/<id> --out source      # needs yt-dlp
node scripts/read-source.mjs demo.mp4 --out source
```

It writes `source.json`, `media/` (the post's videos and pictures, the authors' avatars, the YouTube video, the page's screenshots), `frames/` (contact sheets of each video, a frame every 2 s or every `--every` seconds, and up to 12 key frames at its scene changes) and drafts of `Source.md` and `Look.md` with what it measured. Each video's `cuts` lists every scene change's time: where it changes page, and where a glitch may hide. To choose pieces, read it again with `--every 0.5`, or pull frames at the moments you're deciding on (`ffmpeg -ss 12.3 -i video.mp4 -frames:v 1 f.jpg`).

## What each kind gives

| source | the words | the pictures | the look |
| --- | --- | --- | --- |
| tweet | its text, word for word; the quoted post's text; the linked pages' headings and copy (`--follow`) | its videos and pictures, the quoted post's | the video's frames (palette measured, fonts by eye); a linked landing page's styles |
| landing page | title, description, headings, copy, buttons | screenshots a screen at a time, desktop and phone | measured: fonts, sizes, weights, case and tracking of headlines, text, buttons and labels; colours; radii; `:root` CSS variables; palette by area |
| YouTube video | title, description, chapters, its captions as timed text | the video (720p) | the frames; the thumbnail's type |
| video file | none until it's transcribed (Fil's captions, or whisper) | itself | its frames |

Tweets are read through the public fxtwitter API (no sign-in). YouTube needs `yt-dlp` (`brew install yt-dlp`); without it, bring the video into Fil through Fil for Mac and read the file. Pages are read with playwright, signed out, as anyone sees them.

## Source.md: the words

- **Word for word.** Copy the source's own sentences. The script may shorten and reorder them, never change a claim.
- **Facts it may use.** List every number, name, price and claim the reel may say, each as the source says it ("$0.15 per 1M input tokens"). Nothing else gets said: no invented results, ratings or users.
- **The one idea.** What someone should leave believing, in the creator's words.
- **The hook.** The most surprising true thing in the source, sayable in the first second. Often it's in the post's first line or its video's best moment, not its headline.
- **Other people's work.** A quoted post, a linked repo, a tool someone else made: name them on screen and in the voice ("Ryan's Anatomy skill"), show their handle, never present it as the creator's own.
- **The ask.** Comment a word for the link, follow, the link in bio, or none.

## Look.md: the look

Fill each line from what was measured, then look at the frames and screens before you trust it.

- **Shape.** 9:16 for Reels, TikTok and Shorts; 4:5 or 1:1 for a feed; 16:9 for YouTube. The scenes take it as `HTMLReel.scene({ shape })`.
- **Mode, ground, ink, accent.** From the palette: the ground is the most common colour, the ink the most common far from it, the accent one vivid colour the source really uses for emphasis (a button, a highlight, a key). A measured accent can come out dull when the vivid parts are small: pick it from the frames by eye, then sample it exactly (`ffmpeg -ss 12.3 -i video.mp4 -frames:v 1 -vf crop=40:40:x:y,scale=1:1 -f rawvideo -pix_fmt rgb24 - | xxd -p`).
- **Frame.** The box's corners and backdrop for a framed demo: square and flat on the source's ground for a technical source, rounded over a blurred copy for an app. They go to frame-video as `--radius` and `--backdrop`.
- **Type, as three roles.**
  - Setup: the line that sets up. On a page, its headline or subhead face; in a video, the closest Google font to what it shows.
  - Payoff: the word that lands. Heavier, bigger, or the source's display face.
  - Labels: tags, figures, numbers, small words around a picture. Often the source's mono or small caps.
  Set them as `--reel-setup-font`, `--reel-setup-size`, `--reel-setup-weight`, `--reel-setup-case`, `--reel-setup-track`, the same for `payoff` and `label`, and `--reel-bg`, `--reel-ink`, `--reel-accent`, in the scene's own `:root` after `reel-clock.css`. A page's `font-family` that isn't on Google Fonts gets its closest one there.
- **Background.** What's behind the titles: the source's own ground, its texture or light, a blurred and dimmed frame of its video.
- **Motifs.** Shapes, frames, cards, cursors, rules, figure numbers the source uses: the scenes reuse them, so the reel feels like the source's own.
- **Motion.** How things arrive in the source: snappy and mechanical, soft and slow, springy. The scenes move the same way.

The defaults in `reel-clock.css` (a cinematic serif, a heavy condensed payoff, an orange dot) are one reel's look. Use them only when the source has no look of its own.

## A cursor in the video

A screen recording of a 3D scene, a map or a canvas shows the macOS hand cursor wherever it was dragged, and blind judges name it before anything else: in two reels made from posts of 3D scenes, all four did. Paint it out before framing the pieces. `scripts/decursor.py` needs OpenCV and numpy, which the Mac doesn't have, so make a venv once:

```bash
python3 -m venv ~/.venvs/decursor
~/.venvs/decursor/bin/pip install opencv-python-headless numpy
```

Then, with the pieces chosen (frame-video's `pieces.json`), scan only what the reel plays, look, and clean:

```bash
PY=~/.venvs/decursor/bin/python
$PY scripts/decursor.py scan src.mp4 track.json --pieces pieces.json   # or seconds: 1.5 3.1 13.4 14.8 …
$PY scripts/decursor.py sheet src.mp4 track.json --out decursor-sheet.jpg
$PY scripts/decursor.py clean src.mp4 track.json --out src-clean.mp4
```

and frame `src-clean.mp4` from then on (`frame-video.mjs --video src-clean.mp4`, or each piece's `"video"`).

- **How it finds it.** Templates of the grab hand and the open hand (`scripts/cursors/`, cut from real recordings), each at six sizes from 0.8 to 1.4, because recordings zoom. A place counts by how it looks: q = the smaller of the share of the hand's fill brighter than 190 and the share of its outline ring darker than 75, sure at 0.55 if the place also looks like the hand's picture (zero-mean correlation inside its mask, 0.5 or more; 1,679 of 1,680 real finds did). It searches near the last find at full size first, then the whole frame at a quarter size, at about 25 frames a second on a 1920 × 1440 recording.
- **Fast moves.** A cursor moving fast blurs and stops matching. Gaps of up to 16 frames (at 30 fps) between two sure finds less than 700 px apart are filled in between them and painted wider; frames between two spans that weren't scanned are never filled. Where a span starts or ends mid-move there's no sure find on the far side, so each run of sure finds is also followed out through the frames next to it found at 0.5 or more, each within 300 px of the last, painted wider too.
- **Things that look like a hand.** A paper lantern in the valley video, cream with a dark edge, passed as a sure find for a frame while the cursor changed from the grab to the open hand (q 0.57; its correlation was 0.43 with the open hand, but 0.61 with the grab hand at 1.4). A cursor doesn't jump 700 px and straight back, so a run of up to 5 sure finds that lands at least 300 px off the path between the sure finds either side of it is dropped, and that gap is filled along the path. A thing that looks like a hand and stays there with no cursor near isn't caught: that's what the sheet is for.
- **The paint.** OpenCV's Telea inpaint over the hand grown about 10 px past its outline, which takes its soft shadow too. It reads and writes through ffmpeg with exact rounding, so the colours come back as they went in, at the source's frame rate, with its sound.
- **Look at the sheet.** About 30 finds through the video and 12 of the filled or followed ones (marked `*`), each before and after: a wrong find shows as a smear where no hand was, a hand left half painted as an edge of its outline. A hand it missed shows in frame-video's contact sheet of the body.
- **Another size or cursor.** `--scale` sizes the search for a recording whose cursor is bigger or smaller than the templates' (the grab hand is about 60 px wide in them, outline and all): measure one hand in a frame and divide, and `test` a frame to check (a 1280-wide copy of the 1920-wide recordings they came from takes 0.667). A cursor it doesn't know, white with a dark outline (the pointing hand), gets a template cut from a frame of the same recording, a few px past its outline: `decursor.py template frame.png x y w h point`. Never ship Apple's own cursor files. The arrow (black with a white outline) isn't one it finds.

## The three posts this was tested on

- **MiniMax M3.1 Flash landing pages** (a 51 s 4:3 screen recording of six sites): six looks in one video, so the reel's look comes from the creator's favourite one (the exploded-keyboard pages), and each site gets its moment.
- **Reverse-engineer your home into a Mac app** (70 s, a warm tan isometric house with frosted-glass control cards, quoting @icanberk): warm ground, glass cards, a clean sans; the quoted creator credited.
- **Anatomy for visual explainers** (21 s, technical isometric wireframes with mono labels, quoting @wheresryan22): near-black ground, mono labels as figure captions ("Fig 1"), a thin-rule motif.
