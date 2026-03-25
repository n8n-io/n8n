## Use Cases

Document Question Answering models can be used to answer natural language questions about documents. Typically, document QA models consider textual, layout and potentially visual information. This is useful when the question requires some understanding of the visual aspects of the document.
Nevertheless, certain document QA models can work without document images. Hence the task is not limited to visually-rich documents and allows users to ask questions based on spreadsheets, text PDFs, etc!

### Document Parsing

One of the most popular use cases of document question answering models is the parsing of structured documents. For example, you can extract the name, address, and other information from a form. You can also use the model to extract information from a table, or even a resume.

### Invoice Information Extraction

Another very popular use case is invoice information extraction. For example, you can extract the invoice number, the invoice date, the total amount, the VAT number, and the invoice recipient.

## Inference

You can infer with Document QA models with the 🤗 Transformers library using the [`document-question-answering` pipeline](https://huggingface.co/docs/transformers/en/main_classes/pipelines#transformers.DocumentQuestionAnsweringPipeline). If no model checkpoint is given, the pipeline will be initialized with [`impira/layoutlm-document-qa`](https://huggingface.co/impira/layoutlm-document-qa). This pipeline takes question(s) and document(s) as input, and returns the answer.  
👉 Note that the question answering task solved here is extractive: the model extracts the answer from a context (the document).

```python
from transformers import pipeline
from PIL import Image

pipe = pipeline("document-question-answering", model="naver-clova-ix/donut-base-finetuned-docvqa")

question = "What is the purchase amount?"
image = Image.open("your-document.png")

pipe(image=image, question=question)

## [{'answer': '20,000$'}]
```

## Useful Resources

Would you like to learn more about Document QA? Awesome! Here are some curated resources that you may find helpful!

- [Document Visual Question Answering (DocVQA) challenge](https://rrc.cvc.uab.es/?ch=17)
- [DocVQA: A Dataset for Document Visual Question Answering](https://arxiv.org/abs/2007.00398) (Dataset paper)
- [ICDAR 2021 Competition on Document Visual Question Answering](https://lilianweng.github.io/lil-log/2020/10/29/open-domain-question-answering.html) (Conference paper)
- [HuggingFace's Document Question Answering pipeline](https://huggingface.co/docs/transformers/en/main_classes/pipelines#transformers.DocumentQuestionAnsweringPipeline)
- [Github repo: DocQuery - Document Query Engine Powered by Large Language Models](https://github.com/impira/docquery)

### Notebooks

- [Fine-tuning Donut on DocVQA dataset](https://github.com/NielsRogge/Transformers-Tutorials/tree/0ea77f29d01217587d7e32a848f3691d9c15d6ab/Donut/DocVQA)
- [Fine-tuning LayoutLMv2 on DocVQA dataset](https://github.com/NielsRogge/Transformers-Tutorials/tree/1b4bad710c41017d07a8f63b46a12523bfd2e835/LayoutLMv2/DocVQA)
- [Accelerating Document AI](https://huggingface.co/blog/document-ai)

### Documentation

- [Document question answering task guide](https://huggingface.co/docs/transformers/tasks/document_question_answering)

The contents of this page are contributed by [Eliott Zemour](https://huggingface.co/eliolio) and reviewed by [Kwadwo Agyapon-Ntra](https://huggingface.co/KayO) and [Ankur Goyal](https://huggingface.co/ankrgyl).
