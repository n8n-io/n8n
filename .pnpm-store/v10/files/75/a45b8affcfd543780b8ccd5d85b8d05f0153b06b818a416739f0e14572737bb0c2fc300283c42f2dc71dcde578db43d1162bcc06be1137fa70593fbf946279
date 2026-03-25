## Use Cases

Image-to-3D models can be used in a wide variety of applications that require 3D, such as games, animation, design, architecture, engineering, marketing, and more.

![Image-to-3D Thumbnail](https://huggingface.co/datasets/huggingfacejs/tasks/resolve/main/image-to-3d/image-to-3d-thumbnail.png)

### Generating Meshes

Meshes are the standard representation of 3D in industry.

### Generating Gaussian Splats

[Gaussian Splatting](https://huggingface.co/blog/gaussian-splatting) is a rendering technique that represents scenes as fuzzy points.

### Inference

Inference for this task typically leverages the [Diffusers](https://huggingface.co/docs/diffusers/index) library for inference, using [Custom Pipelines](https://huggingface.co/docs/diffusers/v0.6.0/en/using-diffusers/custom_pipelines).

These are unstandardized and depend on the model. More details can be found in each model repository.

```python
import torch
import requests
import numpy as np
from io import BytesIO
from diffusers import DiffusionPipeline
from PIL import Image

pipeline = DiffusionPipeline.from_pretrained(
    "dylanebert/LGM-full",
    custom_pipeline="dylanebert/LGM-full",
    torch_dtype=torch.float16,
    trust_remote_code=True,
).to("cuda")

input_url = "https://huggingface.co/datasets/dylanebert/iso3d/resolve/main/jpg@512/a_cat_statue.jpg"
input_image = Image.open(BytesIO(requests.get(input_url).content))
input_image = np.array(input_image, dtype=np.float32) / 255.0
result = pipeline("", input_image)
result_path = "/tmp/output.ply"
pipeline.save_ply(result, result_path)
```

In the code above, we:

1. Import the necessary libraries
2. Load the `LGM-full` model and custom pipeline
3. Load and preprocess the input image
4. Run the pipeline on the input image
5. Save the output to a file

### Output Formats

Meshes can be in `.obj`, `.glb`, `.stl`, or `.gltf` format. Other formats are allowed, but won't be rendered in the gradio [Model3D](https://www.gradio.app/docs/gradio/model3d) component.

Splats can be in `.ply` or `.splat` format. They can be rendered in the gradio [Model3D](https://www.gradio.app/docs/gradio/model3d) component using the [gsplat.js](https://github.com/huggingface/gsplat.js) library.

## Useful Resources

- [ML for 3D Course](https://huggingface.co/learn/ml-for-3d-course)
- [3D Arena Leaderboard](https://huggingface.co/spaces/dylanebert/3d-arena)
- [gsplat.js](https://github.com/huggingface/gsplat.js)
