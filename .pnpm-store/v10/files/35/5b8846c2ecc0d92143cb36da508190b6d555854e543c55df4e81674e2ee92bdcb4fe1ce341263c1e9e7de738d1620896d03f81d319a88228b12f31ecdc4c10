## Use Cases

Image-to-video models transform a static image into a video sequence. This can be used for a variety of creative and practical applications.

### Animated Images

Bring still photos to life by adding subtle motion or creating short animated clips. This is great for social media content or dynamic presentations.

### Storytelling from a Single Frame

Expand on the narrative of an image by generating a short video that imagines what happened before or after the moment captured in the photo.

### Video Generation with Visual Consistency

Use an input image as a strong visual anchor to guide the generation of a video, ensuring that the style, characters, or objects in the video remain consistent with the source image.

### Controllable Motion

Image-to-video models can be used to specify the direction or intensity of motion or camera control, giving more fine-grained control over the generated animation.

## Inference

Running the model Wan 2.1 T2V 1.3B with diffusers

```py
import torch
from diffusers import AutoencoderKLWan, WanPipeline
from diffusers.utils import export_to_video

model_id = "Wan-AI/Wan2.1-T2V-1.3B-Diffusers"
vae = AutoencoderKLWan.from_pretrained(model_id, subfolder="vae", torch_dtype=torch.float32)
pipe = WanPipeline.from_pretrained(model_id, vae=vae, torch_dtype=torch.bfloat16)
pipe.to("cuda")

prompt = "A cat walks on the grass, realistic"
negative_prompt = "Bright tones, overexposed, static, blurred details, subtitles, style, works, paintings, images, static, overall gray, worst quality, low quality, JPEG compression residue, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn faces, deformed, disfigured, misshapen limbs, fused fingers, still picture, messy background, three legs, many people in the background, walking backwards"

output = pipe(
    prompt=prompt,
    negative_prompt=negative_prompt,
    height=480,
    width=832,
    num_frames=81,
    guidance_scale=5.0
).frames[0]
export_to_video(output, "output.mp4", fps=15)
```

## Useful Resources

To train image-to-video LoRAs check out [finetrainers](https://github.com/a-r-r-o-w/finetrainers) and [musubi trainer](https://github.com/kohya-ss/musubi-tuner).
