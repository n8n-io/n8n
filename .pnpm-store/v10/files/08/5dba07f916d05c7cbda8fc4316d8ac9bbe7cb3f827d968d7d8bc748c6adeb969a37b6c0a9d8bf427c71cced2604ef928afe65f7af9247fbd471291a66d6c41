## Use Cases

### Image Captioning

Image Captioning is the process of generating textual description of an image.
This can help the visually impaired people to understand what's happening in their surroundings.

### Optical Character Recognition (OCR)

OCR models convert the text present in an image, e.g. a scanned document, to text.

## Inference

### Image Captioning

You can use the 🤗 Transformers library's `image-to-text` pipeline to generate caption for the Image input.

```python
from transformers import pipeline

captioner = pipeline("image-to-text", model="Salesforce/blip-image-captioning-base")
captioner("https://huggingface.co/datasets/Narsil/image_dummy/resolve/main/parrots.png")
## [{'generated_text': 'two birds are standing next to each other '}]
```

### OCR

This code snippet uses Microsoft’s TrOCR, an encoder-decoder model consisting of an image Transformer encoder and a text Transformer decoder for state-of-the-art optical character recognition (OCR) on single-text line images.

```python
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

processor = TrOCRProcessor.from_pretrained('microsoft/trocr-base-handwritten')
model = VisionEncoderDecoderModel.from_pretrained('microsoft/trocr-base-handwritten')
pixel_values = processor(images="image.jpeg", return_tensors="pt").pixel_values

generated_ids = model.generate(pixel_values)
generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

```

You can use [huggingface.js](https://github.com/huggingface/huggingface.js) to infer image-to-text models on Hugging Face Hub.

```javascript
import { InferenceClient } from "@huggingface/inference";

const inference = new InferenceClient(HF_TOKEN);
await inference.imageToText({
	data: await (await fetch("https://picsum.photos/300/300")).blob(),
	model: "Salesforce/blip-image-captioning-base",
});
```

## Useful Resources

- [Image Captioning](https://huggingface.co/docs/transformers/main/en/tasks/image_captioning)
- [Image Captioning Use Case](https://blog.google/outreach-initiatives/accessibility/get-image-descriptions/)
- [Train Image Captioning model on your dataset](https://github.com/NielsRogge/Transformers-Tutorials/blob/master/GIT/Fine_tune_GIT_on_an_image_captioning_dataset.ipynb)
- [Train OCR model on your dataset ](https://github.com/NielsRogge/Transformers-Tutorials/tree/master/TrOCR)

This page was made possible thanks to efforts of [Sukesh Perla](https://huggingface.co/hitchhiker3010) and [Johannes Kolbe](https://huggingface.co/johko).
