## Use Cases

### Video Style Transfer

Apply artistic or cinematic styles to a video while preserving motion and structure. For example, convert real footage into anime, painting, or film-like visuals.

### Frame Interpolation

Generate intermediate frames to make videos smoother or convert 30 FPS videos to 60 FPS. This improves motion flow and enables realistic slow-motion playback.

### Video Super-Resolution

Enhance low-resolution videos into high-definition outputs with preserved detail and sharpness. Ideal for restoring old footage or improving video quality.

### Motion Transfer

Transfer the motion from a source video to another subject while maintaining identity and environment. This enables realistic animation or gesture replication.

### Video Editing & Synthesis

Add, remove, or modify objects in videos while keeping lighting and motion consistent. Perfect for visual effects, object replacement, and content-aware editing.

### Temporal Modification

Change a video’s overall time or environmental conditions, such as day to night or summer to winter. These models preserve motion dynamics and lighting continuity.

### Virtual Try-on

Simulate clothing changes or outfit fitting in videos while keeping the person’s motion and identity intact. Useful for digital fashion and e-commerce applications.

## Inference

Below is an example demonstrating how to use [Lucy-Edit-Dev](https://huggingface.co/decart-ai/Lucy-Edit-Dev) to perform video costume editing, changing a character’s clothing while maintaining identity and motion consistency. Lucy-Edit-Dev is trained on paired video edits, captioned videos, and extended image–text datasets.

```python
!pip install torch diffusers

import torch
from PIL import Image

from diffusers import AutoencoderKLWan, LucyEditPipeline
from diffusers.utils import export_to_video, load_video


url = "https://d2drjpuinn46lb.cloudfront.net/painter_original_edit.mp4"
prompt = "Change the apron and blouse to a classic clown costume: satin polka-dot jumpsuit in bright primary colors, ruffled white collar, oversized pom-pom buttons, white gloves, oversized red shoes, red foam nose; soft window light from left, eye-level medium shot, natural folds and fabric highlights."
negative_prompt = ""
num_frames = 81
height = 480
width = 832

def convert_video(video: List[Image.Image]) -> List[Image.Image]:
    video = load_video(url)[:num_frames]
    video = [video[i].resize((width, height)) for i in range(num_frames)]
    return video

video = load_video(url, convert_method=convert_video)

model_id = "decart-ai/Lucy-Edit-Dev"
vae = AutoencoderKLWan.from_pretrained(model_id, subfolder="vae", torch_dtype=torch.float32)
pipe = LucyEditPipeline.from_pretrained(model_id, vae=vae, torch_dtype=torch.bfloat16)
pipe.to("cuda")

output = pipe(
    prompt=prompt,
    video=video,
    negative_prompt=negative_prompt,
    height=480,
    width=832,
    num_frames=81,
    guidance_scale=5.0
).frames[0]

export_to_video(output, "output.mp4", fps=24)
```

For more inference examples, check out the model cards on Hugging Face, where you can try the provided example code.

## Useful Resources

You can read more about the datasets, model architectures, and open-source implementations in the following repositories:

- [Lumen](https://github.com/Kunbyte-AI/Lumen) - Official implementation of Lumen for text-guided video editing.
- [VIRES](https://github.com/suimuc/VIRES) - Implementation for sketch- and text-guided video instance repainting.
- [ECCV2022-RIFE: Video Frame Interpolation](https://github.com/hzwer/ECCV2022-RIFE) - Real-time video frame interpolation via intermediate flow estimation.
- [StableVSR: Enhancing Perceptual Quality in Video](https://github.com/claudiom4sir/StableVSR) - Super-resolution method to enhance perceptual video quality.
