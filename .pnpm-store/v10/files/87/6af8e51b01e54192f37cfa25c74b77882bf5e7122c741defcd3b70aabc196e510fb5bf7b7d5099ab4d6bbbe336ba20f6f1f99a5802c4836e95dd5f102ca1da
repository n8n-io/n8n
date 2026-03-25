## About the Task

Tabular classification is the task of assigning a label or class given a limited number of attributes. For example, the input can be data related to a customer (balance of the customer, the time being a customer, or more) and the output can be whether the customer will churn from the service or not.
There are three types of categorical variables:

- Binary variables: Variables that can take two values, like yes or no, open or closed. The task of predicting binary variables is called binary classification.
- Ordinal variables: Variables with a ranking relationship, e.g., good, insignificant, and bad product reviews. The task of predicting ordinal variables is called ordinal classification.
- Nominal variables: Variables with no ranking relationship among them, e.g., predicting an animal from their weight and height, where categories are cat, dog, or bird. The task of predicting nominal variables is called multinomial classification.

## Use Cases

### Fraud Detection
Tabular classification models can be used in detecting fraudulent credit card transactions, where the features could be the amount of the transaction and the account balance, and the target to predict could be whether the transaction is fraudulent or not. This is an example of binary classification.

### Churn Prediction
Tabular classification models can be used in predicting customer churn in telecommunication. An example dataset for the task is hosted [here](https://huggingface.co/datasets/scikit-learn/churn-prediction).

# Model Hosting and Inference

You can use [skops](https://skops.readthedocs.io/) for model hosting and inference on the Hugging Face Hub. This library is built to improve production workflows of various libraries that are used to train tabular models, including [sklearn](https://scikit-learn.org/stable/) and [xgboost](https://xgboost.readthedocs.io/en/stable/). Using `skops` you can:

- Easily use Inference Endpoints
- Build neat UIs with one line of code,
- Programmatically create model cards,
- Securely serialize your scikit-learn model. (See limitations of using pickle [here](https://huggingface.co/docs/hub/security-pickle).)

You can push your model as follows:

```python
from skops import hub_utils
# initialize a repository with a trained model
local_repo = "/path_to_new_repo"
hub_utils.init(model, dst=local_repo)
# push to Hub!
hub_utils.push("username/my-awesome-model", source=local_repo)
```

Once the model is pushed, you can infer easily.

```python
import skops.hub_utils as hub_utils
import pandas as pd
data = pd.DataFrame(your_data)
# Load the model from the Hub
res = hub_utils.get_model_output("username/my-awesome-model", data)
```

You can launch a UI for your model with only one line of code!

```python
import gradio as gr
gr.Interface.load("huggingface/username/my-awesome-model").launch()
```

## Useful Resources

- Check out the [scikit-learn organization](https://huggingface.co/scikit-learn) to learn more about different algorithms used for this task.
- [Skops documentation](https://skops.readthedocs.io/en/latest/)
- [Skops announcement blog](https://huggingface.co/blog/skops)
- [Notebook: Persisting your scikit-learn model using skops](https://www.kaggle.com/code/unofficialmerve/persisting-your-scikit-learn-model-using-skops)
- Check out [interactive sklearn examples](https://huggingface.co/sklearn-docs) built with ❤️ using Gradio.

### Training your own model in just a few seconds

We have built a [baseline trainer](https://huggingface.co/spaces/scikit-learn/baseline-trainer) application to which you can drag and drop your dataset. It will train a baseline and push it to your Hugging Face Hub profile with a model card containing information about the model.
