## Use Cases

### Transfer Learning

Models trained on a specific dataset can learn features about the data. For instance, a model trained on a car classification dataset learns to recognize edges and curves on a very high level and car-specific features on a low level. This information can be transferred to a new model that is going to be trained on classifying trucks. This process of extracting features and transferring to another model is called transfer learning.

### Similarity

Features extracted from models contain semantically meaningful information about the world. These features can be used to detect the similarity between two images. Assume there are two images: a photo of a stray cat in a street setting and a photo of a cat at home. These images both contain cats, and the features will contain the information that there's a cat in the image. Thus, comparing the features of a stray cat photo to the features of a domestic cat photo will result in higher similarity compared to any other image that doesn't contain any cats.

## Inference

```python
import torch
from transformers import pipeline

pipe = pipeline(task="image-feature-extraction", model_name="google/vit-base-patch16-384", framework="pt", pool=True)
pipe("https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/cats.png")

feature_extractor(text,return_tensors = "pt")[0].numpy().mean(axis=0)

'[[[0.21236686408519745, 1.0919708013534546, 0.8512550592422485, ...]]]'
```
