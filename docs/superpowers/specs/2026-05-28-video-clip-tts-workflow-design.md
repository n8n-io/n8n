# 自动视频剪辑 n8n 工作流设计

## 背景

本功能是一个自动化视频剪辑工作流，不是 AI 视频生成流程。画面内容全部来自用户上传的素材：封面图、可信内容截图、背景素材视频。系统只负责用脚本文本生成 TTS 音频和字幕，并通过 FFmpeg 将素材剪辑合成为一个 16:9 横屏 MP4。

MVP 阶段只交付可导入 n8n 的 workflow JSON，以及 workflow 运行所需的本地视频合成脚本。暂不做自定义前端页面、模板选择、竖屏输出、批量任务或 AI 视频生成。

## 目标

- 在 n8n 页面中导入并加载一个完整的自动视频剪辑 workflow。
- 通过 n8n Form Trigger 一次性上传 4 个文件：封面图、内容截图、TTS 脚本文本、背景视频。
- 调用火山/豆包 TTS 将脚本文本转换为音频。
- 调用本地合成脚本，用 FFmpeg 输出最终 MP4。
- 输出视频包含三段式剪辑结构：封面展示、内容截图展示、双图置顶正文段。
- 每次执行保留 job 目录，便于失败后排查和重试。

## 非目标

- 不生成 AI 视频画面。
- 不由系统生成封面图。
- 不实现自定义上传页面。
- 不实现视频编辑器。
- 不支持多模板选择。
- 不支持批量生成。
- 不支持 9:16 竖屏输出。
- 不把火山/豆包密钥写死进 workflow JSON。

## 用户输入

n8n Form Trigger 提供 4 个必填字段：

- `cover_image`：封面图，支持 `png`、`jpg`、`jpeg`、`webp`。
- `proof_screenshot`：可信内容截图，支持 `png`、`jpg`、`jpeg`、`webp`。
- `tts_script`：TTS 脚本文本文件，支持 `txt`、`md`。
- `background_video`：背景素材视频，支持 `mp4`、`mov`、`webm`。

MVP 固定输出为 16:9 横屏视频，默认画布为 `1920x1080`、`30fps`、`H.264 + AAC`。

## 工作流节点设计

导入 n8n 后，workflow 节点顺序如下：

```text
Form Trigger
  -> Prepare Job
  -> Save Uploaded Files
  -> Read Script Text
  -> Doubao TTS Request
  -> Save TTS Audio
  -> Build Job Config
  -> Execute Composer Script
  -> Read Final Video
  -> Respond With Result
```

### Form Trigger

提供上传表单，收集封面图、内容截图、脚本文件和背景视频。该节点是 MVP 的页面入口，用户可以直接在 n8n 表单页面完成上传。

### Prepare Job

生成本次任务的 `jobId` 和目录路径。`jobId` 使用时间戳加随机串，例如 `20260528-101530-a8f42c`。

### Save Uploaded Files

将上传的二进制文件写入任务目录的 `inputs/` 子目录，并标准化文件名。

### Read Script Text

读取脚本文本内容，做最小清洗：

- 去掉首尾空白。
- 合并连续空行。
- 保留中文标点，供字幕切分使用。
- 如果文本为空，终止 workflow 并返回明确错误。

### Doubao TTS Request

通过 HTTP Request 调用火山/豆包 TTS。密钥从 n8n credential 或环境变量读取，不写入 workflow JSON。返回的音频保存为 `tts/audio.mp3`。

### Build Job Config

生成 `job.json`，作为 n8n 与合成脚本之间的稳定接口。n8n 只负责准备配置，不直接拼接复杂 FFmpeg 命令。

### Execute Composer Script

调用本地脚本：

```bash
node tools/video-composer/compose-video.mjs /tmp/n8n-video-jobs/<jobId>/job.json
```

合成脚本负责生成字幕文件、组织 FFmpeg filtergraph、输出最终视频。

### Read Final Video

读取 `render/final.mp4`。如果文件不存在或大小为 0，workflow 返回合成失败。

### Respond With Result

MVP 可以返回本地输出路径和任务目录；如果 n8n 实例支持返回二进制文件，也可以返回 `final.mp4` 文件本身。默认优先返回路径，避免大文件响应超时。

## 任务目录结构

每次执行创建独立目录：

```text
/tmp/n8n-video-jobs/<jobId>/
  inputs/
    cover.png
    screenshot.png
    script.txt
    background.mp4
  tts/
    audio.mp3
    tts-response.json
  render/
    subtitles.ass
    ffmpeg.log
    final.mp4
  job.json
```

## job.json 接口

`job.json` 示例：

```json
{
  "jobId": "20260528-101530-a8f42c",
  "inputs": {
    "coverImage": "/tmp/n8n-video-jobs/20260528-101530-a8f42c/inputs/cover.png",
    "screenshotImage": "/tmp/n8n-video-jobs/20260528-101530-a8f42c/inputs/screenshot.png",
    "backgroundVideo": "/tmp/n8n-video-jobs/20260528-101530-a8f42c/inputs/background.mp4",
    "scriptText": "/tmp/n8n-video-jobs/20260528-101530-a8f42c/inputs/script.txt",
    "ttsAudio": "/tmp/n8n-video-jobs/20260528-101530-a8f42c/tts/audio.mp3"
  },
  "output": {
    "video": "/tmp/n8n-video-jobs/20260528-101530-a8f42c/render/final.mp4",
    "subtitles": "/tmp/n8n-video-jobs/20260528-101530-a8f42c/render/subtitles.ass",
    "ffmpegLog": "/tmp/n8n-video-jobs/20260528-101530-a8f42c/render/ffmpeg.log"
  },
  "video": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "coverDuration": 3,
    "screenshotDuration": 4
  },
  "layout": {
    "coverTop": { "x": 80, "y": 60, "width": 560 },
    "screenshotTop": { "x": 1280, "y": 60, "width": 560 },
    "subtitleBottomMargin": 90
  }
}
```

## 视频剪辑时间线

最终成片分为 3 个阶段。

### 阶段 1：封面展示

时间：`0s - 3s`

- 背景视频铺底，可正常显示或轻微模糊。
- 上传封面图作为主视觉大图展示。
- TTS 可以从 `0s` 或 `0.3s` 开始；MVP 默认从 `0s` 开始。
- 字幕同步显示在底部。

### 阶段 2：内容截图展示

时间：`3s - 7s`

- 背景视频继续铺底。
- 上传的可信内容截图作为主视觉大图展示。
- 字幕继续跟随 TTS。

### 阶段 3：双图置顶正文段

时间：`7s - 视频结束`

- 背景视频全屏铺底。
- 封面图缩小放置在左上角。
- 内容截图缩小放置在右上角。
- TTS 音频贯穿正文段。
- 字幕显示在底部，不遮挡两个置顶图片。

如果 TTS 音频总时长不足 7 秒，合成脚本仍生成前两个阶段，并将第三阶段时长压缩为 0。MVP 不额外拉长音频或静音补齐。

## 合成脚本职责

`tools/video-composer/compose-video.mjs` 负责：

- 校验 `job.json` 中的输入文件是否存在。
- 用 `ffprobe` 获取 TTS 音频时长。
- 根据脚本文本生成 `.ass` 字幕。
- 将背景视频缩放/裁剪为 16:9。
- 当背景视频短于 TTS 时自动循环。
- 生成封面展示段。
- 生成内容截图展示段。
- 生成双图置顶正文段。
- 将 TTS 音频混入最终视频。
- 将字幕烧录到最终视频。
- 将 FFmpeg 输出写入 `render/ffmpeg.log`。
- 输出 `render/final.mp4`。

## 字幕规则

MVP 使用脚本文本进行简单切分，不做语音识别对齐：

- 按中文标点、英文标点和换行切分字幕片段。
- 每条字幕最短显示 1.2 秒，最长显示 4 秒。
- 按 TTS 总时长将字幕片段均匀分布。
- 字幕样式为底部居中，黑色半透明底，浅黄色或白色大字。

该规则足够跑通 MVP。后续如需更精准对齐，可以接入强制对齐或 ASR。

## 错误处理

workflow 与脚本需要区分以下错误：

- 上传校验失败：缺少文件、文件类型不支持、脚本文本为空。
- TTS 失败：豆包接口返回错误、音频文件为空、密钥缺失。
- 合成失败：FFmpeg 失败、输入文件不可读、输出文件不存在。
- 输出失败：`final.mp4` 文件大小为 0 或 n8n 读取失败。

失败时保留 job 目录，尤其是 `job.json`、`tts-response.json`、`subtitles.ass`、`ffmpeg.log`。这样可以用同一份 `job.json` 手动重放合成脚本。

## 验收标准

- workflow JSON 可以导入 n8n。
- 导入后能在 n8n 编辑器中看到完整节点链路。
- Form Trigger 能一次上传 4 个输入文件。
- TTS 节点能调用火山/豆包生成音频文件。
- 合成脚本能通过 Execute Command 被 workflow 调用。
- 成功执行后生成 `render/final.mp4`。
- 输出视频为 16:9 横屏 MP4。
- `0s - 3s` 展示封面大图。
- `3s - 7s` 展示内容截图大图。
- `7s - 结束` 封面和截图缩小置顶常驻。
- 背景视频始终位于底层，短于音频时自动循环。
- 字幕和 TTS 音频贯穿视频。
- 合成失败时能在 `render/ffmpeg.log` 看到 FFmpeg 错误。

## 运行前置条件

本机需要安装并可执行：

- `node`
- `ffmpeg`
- `ffprobe`
- `n8n`

火山/豆包 TTS 的 API 配置通过 n8n credential 或环境变量提供。workflow JSON 不包含真实密钥。

## 交付物

MVP 实施完成后应包含：

- 可导入 n8n 的 workflow JSON。
- 本地视频合成脚本 `tools/video-composer/compose-video.mjs`。
- 使用说明，包含环境变量、导入方式、运行方式和常见失败排查。
