## About the Task

Zero-shot image classification is a computer vision task to classify images into one of several classes, without any prior training or knowledge of the classes.

Zero shot image classification works by transferring knowledge learnt during training of one model, to classify novel classes that was not present in the training data. So this is a variation of [transfer learning](https://www.youtube.com/watch?v=BqqfQnyjmgg). For instance, a model trained to differentiate cars from airplanes can be used to classify images of ships.

The data in this learning paradigm consists of

- Seen data - images and their corresponding labels
- Unseen data - only labels and no images
- Auxiliary information - additional information given to the model during training connecting the unseen and seen data. This can be in the form of textual description or word embeddings.

## Use Cases

### Image Retrieval

Zero-shot learning resolves several challenges in image retrieval systems. For example, with the rapid growth of categories on the web, it is challenging to index images based on unseen categories. With zero-shot learning we can associate unseen categories to images by exploiting attributes to model the relationships among visual features and labels.

### Action Recognition

Action recognition is the task of identifying when a person in an image/video is performing a given action from a set of actions. If all the possible actions are not known beforehand, conventional deep learning models fail. With zero-shot learning, for a given domain of a set of actions, we can create a mapping connecting low-level features and a semantic description of auxiliary data to classify unknown classes of actions.

## Task Variants

You can contribute variants of this task [here](https://github.com/huggingface/hub-docs/blob/main/tasks/src/zero-shot-image-classification/about.md).

## Inference

The model can be loaded with the zero-shot-image-classification pipeline like so:

```python
from transformers import pipeline
# More models in the model hub.
model_name = "openai/clip-vit-large-patch14-336"
classifier = pipeline("zero-shot-image-classification", model = model_name)
```

You can then use this pipeline to classify images into any of the class names you specify. You can specify more than two class labels too.

```python
image_to_classify = "path_to_cat_and_dog_image.jpeg"
labels_for_classification =  ["cat and dog",
                              "lion and cheetah",
                              "rabbit and lion"]
scores = classifier(image_to_classify,
                    candidate_labels = labels_for_classification)
```

The classifier would return a list of dictionaries after the inference which is stored in the variable `scores` in the code snippet above. Variable `scores` would look as follows:

```python
[{'score': 0.9950482249259949, 'label': 'cat and dog'},
{'score': 0.004863627254962921, 'label': 'rabbit and lion'},
{'score': 8.816882473183796e-05, 'label': 'lion and cheetah'}]
```

The dictionary at the zeroth index of the list will contain the label with the highest score.

```python
print(f"The highest score is {scores[0]['score']:.3f} for the label {scores[0]['label']}")
```

The output from the print statement above would look as follows:

```
The highest probability is 0.995 for the label cat and dog
```

## Useful Resources

- [Zero-shot image classification task guide](https://huggingface.co/docs/transformers/tasks/zero_shot_image_classification).
- [Image-text Similarity Search](https://huggingface.co/learn/cookbook/faiss_with_hf_datasets_and_clip)

This page was made possible thanks to the efforts of [Shamima Hossain](https://huggingface.co/Shamima), [Haider Zaidi
](https://huggingface.co/chefhaider) and [Paarth Bhatnagar](https://huggingface.co/Paarth).
