## Use Cases

### Filtering an Image

When filtering for an image, the generated masks might serve as an initial filter to eliminate irrelevant information. For instance, when monitoring vegetation in satellite imaging, mask generation models identify green spots, highlighting the relevant region of the image.

### Masked Image Modelling

Generating masks can facilitate learning, especially in semi or unsupervised learning. For example, the [BEiT model](https://huggingface.co/docs/transformers/model_doc/beit) uses image-mask patches in the pre-training.

### Human-in-the-loop Computer Vision Applications

For applications where humans are in the loop, masks highlight certain regions of images for humans to validate.

### Medical Imaging

Mask generation models are used in medical imaging to aid in segmenting and analyzing specific regions.

### Autonomous Vehicles

Mask generation models are used to create segments and masks for obstacles and other objects in view.

This page was made possible thanks to the efforts of [Raj Aryan](https://huggingface.co/thatrajaryan) and other contributors.

## Task Variants

### Segmentation

Image Segmentation divides an image into segments where each pixel is mapped to an object. This task has multiple variants, such as instance segmentation, panoptic segmentation, and semantic segmentation. You can learn more about segmentation on its [task page](https://huggingface.co/tasks/image-segmentation).

## Inference

Mask generation models often work in two modes: segment everything or prompt mode.
The example below works in segment-everything-mode, where many masks will be returned.

```python
from transformers import pipeline

generator = pipeline("mask-generation", model="Zigeng/SlimSAM-uniform-50", points_per_batch=64, device="cuda")
image_url = "https://huggingface.co/ybelkada/segment-anything/resolve/main/assets/car.png"
outputs = generator(image_url)
outputs["masks"]
# array of multiple binary masks returned for each generated mask
```

Prompt mode takes in three types of prompts:

- **Point prompt:** The user can select a point on the image, and a meaningful segment around the point will be returned.
- **Box prompt:** The user can draw a box on the image, and a meaningful segment within the box will be returned.
- **Text prompt:** The user can input a text, and the objects of that type will be segmented. Note that this capability has not yet been released and has only been explored in research.

Below you can see how to use an input-point prompt. It also demonstrates direct model inference without the `pipeline` abstraction. The input prompt here is a nested list where the outermost list is the batch size (`1`), then the number of points (also `1` in this example), and the innermost list contains the actual coordinates of the point (`[450, 600]`).

```python
from transformers import SamModel, SamProcessor
from PIL import Image
import requests

model = SamModel.from_pretrained("Zigeng/SlimSAM-uniform-50").to("cuda")
processor = SamProcessor.from_pretrained("Zigeng/SlimSAM-uniform-50")

raw_image = Image.open(requests.get(image_url, stream=True).raw).convert("RGB")
# pointing to the car window
input_points = [[[450, 600]]]
inputs = processor(raw_image, input_points=input_points, return_tensors="pt").to("cuda")
outputs = model(**inputs)
masks = processor.post_process_masks(outputs.pred_masks.cpu(), inputs["original_sizes"].cpu(), inputs["reshaped_input_sizes"].cpu())
scores = outputs.iou_scores
```

## Useful Resources

Would you like to learn more about mask generation? Great! Here you can find some curated resources that you may find helpful!

- [Segment anything model](https://huggingface.co/docs/transformers/main/model_doc/sam)
