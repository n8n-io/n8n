## Use Cases

### Multimodal Document Retrieval

Visual document retrieval models can be used to retrieve relevant documents when given a text query. One needs to index the documents first, which is a one-time operation. After indexing is done, the retrieval model takes in a text query (question) and number `k` of documents to return, and the model returns the top-k most relevant documents for the query. The index can be used repetitively for inference.

### Multimodal Retrieval Augmented Generation (RAG)

Multimodal RAG is the task of generating answers from documents (texts or images) when given a text query and a bunch of documents. These documents and the text query can be fed to [a vision language model](https://huggingface.co/tasks/image-text-to-text) to get the actual answer.

## Inference

You can use transformers to infer visual document retrieval models. To calculate similarity between images and text, simply process both separately and pass each processed input through the model. The model outputs can then be passed to calculate similarity scores.

```python
import torch
from PIL import Image
from transformers import ColPaliForRetrieval, ColPaliProcessor

device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

model = ColPaliForRetrieval.from_pretrained(
    "vidore/colpali-v1.2-hf",
    torch_dtype=torch.bfloat16,
).to(device)

processor = ColPaliProcessor.from_pretrained("vidore/colpali-v1.2-hf")

# Your inputs (replace dummy images with screenshots of your documents)
images = [
    Image.new("RGB", (32, 32), color="white"),
    Image.new("RGB", (16, 16), color="black"),
]
queries = [
    "What is the organizational structure for our R&D department?",
    "Can you provide a breakdown of last year’s financial performance?",
]

# Process the image and text
batch_images = processor(images=images).to(device)
batch_queries = processor(text=queries).to(device)

with torch.no_grad():
    image_embeddings = model(**batch_images).embeddings
    query_embeddings = model(**batch_queries).embeddings

# Score the queries against the images
scores = processor.score_retrieval(query_embeddings, image_embeddings)
```

## Useful Resources

- [Multimodal Retrieval Augmented Generation using ColPali and Qwen2VL](https://github.com/merveenoyan/smol-vision/blob/main/ColPali_%2B_Qwen2_VL.ipynb)
- [Fine-tuning ColPali for Multimodal Retrieval Augmented Generation](https://github.com/merveenoyan/smol-vision/blob/main/Finetune_ColPali.ipynb)
