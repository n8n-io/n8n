## Use Cases

### SQL execution

You can use the Table Question Answering models to simulate SQL execution by inputting a table.

### Table Question Answering

Table Question Answering models are capable of answering questions based on a table.

## Task Variants

This place can be filled with variants of this task if there's any.

## Inference

You can infer with TableQA models using the 🤗 Transformers library.

```python
from transformers import pipeline
import pandas as pd

# prepare table + question
data = {"Actors": ["Brad Pitt", "Leonardo Di Caprio", "George Clooney"], "Number of movies": ["87", "53", "69"]}
table = pd.DataFrame.from_dict(data)
question = "how many movies does Leonardo Di Caprio have?"

# pipeline model
# Note: you must to install torch-scatter first.
tqa = pipeline(task="table-question-answering", model="google/tapas-large-finetuned-wtq")

# result

print(tqa(table=table, query=question)['cells'][0])
#53

```

## Useful Resources

In this area, you can insert useful resources about how to train or use a model for this task.

This task page is complete thanks to the efforts of [Hao Kim Tieu](https://huggingface.co/haotieu). 🦸
