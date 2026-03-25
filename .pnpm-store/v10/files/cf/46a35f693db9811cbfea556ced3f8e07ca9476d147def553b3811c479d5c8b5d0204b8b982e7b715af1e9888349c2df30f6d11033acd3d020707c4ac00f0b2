## Use Cases

Depth estimation models can be used to estimate the depth of different objects present in an image.

### Estimation of Volumetric Information
Depth estimation models are widely used to study volumetric formation of objects present inside an image. This is an important use case in the domain of computer graphics.

### 3D Representation

Depth estimation models can also be used to develop a 3D representation from a 2D image.

## Depth Estimation Subtasks

There are two depth estimation subtasks.

- **Absolute depth estimation**: Absolute (or metric) depth estimation aims to provide exact depth measurements from the camera. Absolute depth estimation models output depth maps with real-world distances in meter or feet.

- **Relative depth estimation**: Relative depth estimation aims to predict the depth order of objects or points in a scene without providing the precise measurements.

## Inference

With the `transformers` library, you can use the `depth-estimation` pipeline to infer with image classification models. You can initialize the pipeline with a model id from the Hub. If you do not provide a model id it will initialize with [Intel/dpt-large](https://huggingface.co/Intel/dpt-large) by default. When calling the pipeline you just need to specify a path, http link or an image loaded in PIL. Additionally, you can find a comprehensive list of various depth estimation models at [this link](https://huggingface.co/models?pipeline_tag=depth-estimation).

```python
from transformers import pipeline

estimator = pipeline(task="depth-estimation", model="Intel/dpt-large")
result = estimator(images="http://images.cocodataset.org/val2017/000000039769.jpg")
result

# {'predicted_depth': tensor([[[ 6.3199,  6.3629,  6.4148,  ..., 10.4104, 10.5109, 10.3847],
#           [ 6.3850,  6.3615,  6.4166,  ..., 10.4540, 10.4384, 10.4554],
#           [ 6.3519,  6.3176,  6.3575,  ..., 10.4247, 10.4618, 10.4257],
#           ...,
#           [22.3772, 22.4624, 22.4227,  ..., 22.5207, 22.5593, 22.5293],
#           [22.5073, 22.5148, 22.5114,  ..., 22.6604, 22.6344, 22.5871],
#           [22.5176, 22.5275, 22.5218,  ..., 22.6282, 22.6216, 22.6108]]]),
#  'depth': <PIL.Image.Image image mode=L size=640x480 at 0x7F1A8BFE5D90>}

# You can visualize the result just by calling `result["depth"]`.
```

## Useful Resources

- [Monocular depth estimation task guide](https://huggingface.co/docs/transformers/tasks/monocular_depth_estimation)
