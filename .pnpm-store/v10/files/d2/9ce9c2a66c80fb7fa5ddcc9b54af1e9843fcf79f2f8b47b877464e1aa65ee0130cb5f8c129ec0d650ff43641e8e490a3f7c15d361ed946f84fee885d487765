## Use Cases

### Autonomous Driving

Segmentation models are used to identify road patterns such as lanes and obstacles for safer driving.

### Background Removal

Image Segmentation models are used in cameras to erase the background of certain objects and apply filters to them.

### Medical Imaging

Image Segmentation models are used to distinguish organs or tissues, improving medical imaging workflows. Models are used to segment dental instances, analyze X-Ray scans or even segment cells for pathological diagnosis. This [dataset](https://github.com/v7labs/covid-19-xray-dataset) contains images of lungs of healthy patients and patients with COVID-19 segmented with masks. Another [segmentation dataset](https://ivdm3seg.weebly.com/data.html) contains segmented MRI data of the lower spine to analyze the effect of spaceflight simulation.

## Task Variants

### Semantic Segmentation

Semantic Segmentation is the task of segmenting parts of an image that belong to the same class. Semantic Segmentation models make predictions for each pixel and return the probabilities of the classes for each pixel. These models are evaluated on Mean Intersection Over Union (Mean IoU).

### Instance Segmentation

Instance Segmentation is the variant of Image Segmentation where every distinct object is segmented, instead of one segment per class.

### Panoptic Segmentation

Panoptic Segmentation is the Image Segmentation task that segments the image both by instance and by class, assigning each pixel a different instance of the class.

## Inference

You can infer with Image Segmentation models using the `image-segmentation` pipeline. You need to install [timm](https://github.com/rwightman/pytorch-image-models) first.

```python
!pip install timm
model = pipeline("image-segmentation")
model("cat.png")
#[{'label': 'cat',
#  'mask': mask_code,
#  'score': 0.999}
# ...]
```

You can use [huggingface.js](https://github.com/huggingface/huggingface.js) to infer image segmentation models on Hugging Face Hub.

```javascript
import { InferenceClient } from "@huggingface/inference";

const inference = new InferenceClient(HF_TOKEN);
await inference.imageSegmentation({
	data: await (await fetch("https://picsum.photos/300/300")).blob(),
	model: "facebook/mask2former-swin-base-coco-panoptic",
});
```

## Useful Resources

Would you like to learn more about image segmentation? Great! Here you can find some curated resources that you may find helpful!

- [Fine-Tune a Semantic Segmentation Model with a Custom Dataset](https://huggingface.co/blog/fine-tune-segformer)
- [Walkthrough of Computer Vision Ecosystem in Hugging Face - CV Study Group](https://www.youtube.com/watch?v=oL-xmufhZM8)
- [A Guide on Universal Image Segmentation with Mask2Former and OneFormer](https://huggingface.co/blog/mask2former)
- [Zero-shot image segmentation with CLIPSeg](https://huggingface.co/blog/clipseg-zero-shot)
- [Semantic segmentation task guide](https://huggingface.co/docs/transformers/tasks/semantic_segmentation)
