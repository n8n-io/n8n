## Use Cases

Image classification models can be used when we are not interested in specific instances of objects with location information or their shape.

### Keyword Classification

Image classification models are used widely in stock photography to assign each image a keyword.

### Image Search

Models trained in image classification can improve user experience by organizing and categorizing photo galleries on the phone or in the cloud, on multiple keywords or tags.

## Inference

With the `transformers` library, you can use the `image-classification` pipeline to infer with image classification models. You can initialize the pipeline with a model id from the Hub. If you do not provide a model id it will initialize with [google/vit-base-patch16-224](https://huggingface.co/google/vit-base-patch16-224) by default. When calling the pipeline you just need to specify a path, http link or an image loaded in PIL. You can also provide a `top_k` parameter which determines how many results it should return.

```python
from transformers import pipeline
clf = pipeline("image-classification")
clf("path_to_a_cat_image")

[{'label': 'tabby cat', 'score': 0.731},
...
]
```

You can use [huggingface.js](https://github.com/huggingface/huggingface.js) to classify images using models on Hugging Face Hub.

```javascript
import { InferenceClient } from "@huggingface/inference";

const inference = new InferenceClient(HF_TOKEN);
await inference.imageClassification({
	data: await (await fetch("https://picsum.photos/300/300")).blob(),
	model: "microsoft/resnet-50",
});
```

## Useful Resources

- [Let's Play Pictionary with Machine Learning!](https://www.youtube.com/watch?v=LS9Y2wDVI0k)
- [Fine-Tune ViT for Image Classification with 🤗Transformers](https://huggingface.co/blog/fine-tune-vit)
- [Walkthrough of Computer Vision Ecosystem in Hugging Face - CV Study Group](https://www.youtube.com/watch?v=oL-xmufhZM8)
- [Computer Vision Study Group: Swin Transformer](https://www.youtube.com/watch?v=Ngikt-K1Ecc)
- [Computer Vision Study Group: Masked Autoencoders Paper Walkthrough](https://www.youtube.com/watch?v=Ngikt-K1Ecc)
- [Image classification task guide](https://huggingface.co/docs/transformers/tasks/image_classification)

### Creating your own image classifier in just a few minutes

With [HuggingPics](https://github.com/nateraw/huggingpics), you can fine-tune Vision Transformers for anything using images found on the web. This project downloads images of classes defined by you, trains a model, and pushes it to the Hub. You even get to try out the model directly with a working widget in the browser, ready to be shared with all your friends!
