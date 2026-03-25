## Use Cases

Video classification models can be used to categorize what a video is all about.

### Activity Recognition

Video classification models are used to perform activity recognition which is useful for fitness applications. Activity recognition is also helpful for vision-impaired individuals especially when they're commuting.

### Video Search

Models trained in video classification can improve user experience by organizing and categorizing video galleries on the phone or in the cloud, on multiple keywords or tags.

## Inference

Below you can find code for inferring with a pre-trained video classification model.

```python
from transformers import pipeline

pipe = pipeline(task = "video-classification", model="nateraw/videomae-base-finetuned-ucf101-subset")
pipe("https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/transformers/basketball.avi?download=true")

#[{'score': 0.90, 'label': 'BasketballDunk'},
# {'score': 0.02, 'label': 'BalanceBeam'},
# ... ]
```

## Useful Resources

- [Developing a simple video classification model](https://keras.io/examples/vision/video_classification)
- [Video classification with Transformers](https://keras.io/examples/vision/video_transformers)
- [Building a video archive](https://www.youtube.com/watch?v=_IeS1m8r6SY)
- [Video classification task guide](https://huggingface.co/docs/transformers/tasks/video_classification)

### Creating your own video classifier in minutes

- [Fine-tuning tutorial notebook (PyTorch)](https://colab.research.google.com/github/huggingface/notebooks/blob/main/examples/video_classification.ipynb)
