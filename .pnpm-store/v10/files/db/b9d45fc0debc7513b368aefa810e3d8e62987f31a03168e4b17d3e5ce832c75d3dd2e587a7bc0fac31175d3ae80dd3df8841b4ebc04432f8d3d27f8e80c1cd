## Use Cases

### Image Animation

Image-text-to-video models can be used to animate still images based on text descriptions. For example, you can provide a landscape photo and the instruction "A camera pan from left to right" to create a video with camera movement.

### Dynamic Content Creation

Transform images into video by adding motion, transformations, or effects described in text prompts. This is useful for creating engaging social media content, presentations, or marketing materials.

### Guided Video Generation

Use a reference image with text prompts to guide the video generation process. This provides more control over the visual style and composition compared to text-to-video models alone.

### Story Visualization

Create video sequences from storyboards or concept art by providing scene descriptions. This can help filmmakers and animators visualize scenes before production.

### Motion Control

Generate videos with specific camera movements, object motions, or scene transitions by combining reference images with detailed motion descriptions.

## Task Variants

### Image-to-Video with Motion Control

Models that generate videos from images while following specific motion instructions, such as camera movements, object animations, or scene dynamics.

### Reference-guided Video Generation

Models that use a reference image to guide the visual style and composition of the generated video while incorporating text prompts for motion and transformation control.

### Conditional Video Synthesis

Models that perform specific video transformations based on text conditions, such as adding weather effects, time-of-day changes, or environmental animations.

## Inference

You can use the Diffusers library to interact with image-text-to-video models. Here's example snippet to use `LTXImageToVideoPipeline`.

```python
import torch
from diffusers import LTXImageToVideoPipeline
from diffusers.utils import export_to_video, load_image

pipe = LTXImageToVideoPipeline.from_pretrained("Lightricks/LTX-Video", torch_dtype=torch.bfloat16)
pipe.to("cuda")

image = load_image(
    "https://huggingface.co/datasets/a-r-r-o-w/tiny-meme-dataset-captioned/resolve/main/images/8.png"
)
prompt = "A young girl stands calmly in the foreground, looking directly at the camera, as a house fire rages in the background. Flames engulf the structure, with smoke billowing into the air. Firefighters in protective gear rush to the scene, a fire truck labeled '38' visible behind them. The girl's neutral expression contrasts sharply with the chaos of the fire, creating a poignant and emotionally charged scene."
negative_prompt = "worst quality, inconsistent motion, blurry, jittery, distorted"

video = pipe(
    image=image,
    prompt=prompt,
    negative_prompt=negative_prompt,
    width=704,
    height=480,
    num_frames=161,
    num_inference_steps=50,
).frames[0]
export_to_video(video, "output.mp4", fps=24)
```

## Useful Resources

- [LTX-Video Model Card](https://huggingface.co/Lightricks/LTX-Video)
- [Text-to-Video: The Task, Challenges and the Current State](https://huggingface.co/blog/text-to-video)
- [Diffusers documentation on Video Generation](https://huggingface.co/docs/diffusers/using-diffusers/text-img2vid)
