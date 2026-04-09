## Use Cases

### Instruction-based Image Editing

Image-text-to-image models can be used to edit images based on natural language instructions. For example, you can provide an image of a summer landscape and the instruction "Make it winter, add snow" to generate a winter version of the same scene.

### Style Transfer

These models can apply artistic styles or transformations to images based on text descriptions. For instance, you can transform a photo into a painting style by providing prompts like "Make it look like a Van Gogh painting" or "Convert to watercolor style."

### Image Variations

Generate variations of an existing image by providing different text prompts. This is useful for creative workflows where you want to explore different versions of the same image with specific modifications.

### Guided Image Generation

Use a reference image along with text prompts to guide the generation process. This allows for more controlled image generation compared to text-to-image models alone, as the reference image provides structural guidance.

### Image Inpainting and Outpainting

Fill in missing or masked parts of an image based on text descriptions, or extend an image beyond its original boundaries with text-guided generation.

## Task Variants

### Instruction-based Editing

Models that follow natural language instructions to edit images, which can perform complex edits like object removal, color changes, and compositional modifications.

### Reference-guided Generation

Models that use a reference image to guide the generation process while incorporating text prompts to control specific attributes or modifications.

### Conditional Image-to-Image

Models that perform specific transformations based on text conditions, such as changing weather conditions, time of day, or seasonal variations.

## Inference

You can use the Diffusers library to interact with image-text-to-image models.

```python
import torch
from diffusers import Flux2Pipeline
from diffusers.utils import load_image

repo_id = "black-forest-labs/FLUX.2-dev"
device = "cuda:0"
torch_dtype = torch.bfloat16

pipe = Flux2Pipeline.from_pretrained(
    repo_id, torch_dtype=torch_dtype
)
pipe.enable_model_cpu_offload() #no need to do cpu offload for >80G VRAM carts like H200, B200, etc. and do a `pipe.to(device)` instead

prompt = "Realistic macro photograph of a hermit crab using a soda can as its shell, partially emerging from the can, captured with sharp detail and natural colors, on a sunlit beach with soft shadows and a shallow depth of field, with blurred ocean waves in the background. The can has the text `BFL Diffusers` on it and it has a color gradient that start with #FF5733 at the top and transitions to #33FF57 at the bottom."

#cat_image = load_image("https://huggingface.co/spaces/zerogpu-aoti/FLUX.1-Kontext-Dev-fp8-dynamic/resolve/main/cat.png")
image = pipe(
    prompt=prompt,
    #image=[cat_image] #multi-image input
    generator=torch.Generator(device=device).manual_seed(42),
    num_inference_steps=50,
    guidance_scale=4,
).images[0]

image.save("flux2_output.png")
```

## Useful Resources

- [FLUX.2 Model Card](https://huggingface.co/black-forest-labs/FLUX.2-dev)
- [Diffusers documentation on Image-to-Image](https://huggingface.co/docs/diffusers/using-diffusers/img2img)
- [ControlNet for Conditional Image Generation](https://huggingface.co/docs/diffusers/using-diffusers/controlnet)
