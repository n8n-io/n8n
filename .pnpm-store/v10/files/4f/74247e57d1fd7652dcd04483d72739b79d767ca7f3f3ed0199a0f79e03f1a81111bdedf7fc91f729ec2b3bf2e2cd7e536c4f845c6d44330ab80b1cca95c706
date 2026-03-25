## About the Task

Tabular regression is the task of predicting a numerical value given a set of attributes/features. _Tabular_ meaning that data is stored in a table (like an excel sheet), and each sample is contained in its own row. The features used to predict our target can be both numerical and categorical. However, including categorical features often requires additional preprocessing/feature engineering (a few models do accept categorical features directly, like [CatBoost](https://catboost.ai/)). An example of tabular regression would be predicting the weight of a fish given its' species and length.

## Use Cases

### Sales Prediction: a Use Case for Predicting a Continuous Target Variable

Here the objective is to predict a continuous variable based on a set of input variable(s). For example, predicting `sales` of an ice cream shop based on `temperature` of weather and `duration of hours` shop was open. Here we can build a regression model with `temperature` and `duration of hours` as input variable and `sales` as target variable.

### Missing Value Imputation for Other Tabular Tasks
In real-world applications, due to human error or other reasons, some of the input values can be missing or there might not be any recorded data. Considering the example above, say the shopkeeper's watch was broken and they forgot to calculate the `hours` for which the shop was open. This will lead to a missing value in their dataset. In this case, missing values could be replaced it with zero, or average hours for which the shop is kept open. Another approach we can try is to use `temperature` and `sales` variables to predict the `hours` variable here.

## Model Training

A simple regression model can be created using `sklearn` as follows:

```python
#set the input features
X = data[["Feature 1", "Feature 2", "Feature 3"]]
#set the target variable
y = data["Target Variable"]
#initialize the model
model = LinearRegression()
#Fit the model
model.fit(X, y)
```

# Model Hosting and Inference

You can use [skops](https://skops.readthedocs.io/) for model hosting and inference on the Hugging Face Hub. This library is built to improve production workflows of various libraries that are used to train tabular models, including [sklearn](https://scikit-learn.org/stable/) and [xgboost](https://xgboost.readthedocs.io/en/stable/). Using `skops` you can:

- Easily use Inference Endpoints,
- Build neat UIs with one line of code,
- Programmatically create model cards,
- Securely serialize your models. (See limitations of using pickle [here](https://huggingface.co/docs/hub/security-pickle).)

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

## Useful Resources

- [Skops documentation](https://skops.readthedocs.io/en/stable/index.html)

- Check out [interactive sklearn examples](https://huggingface.co/sklearn-docs) built with ❤️ using Gradio.
- [Notebook: Persisting your scikit-learn model using skops](https://www.kaggle.com/code/unofficialmerve/persisting-your-scikit-learn-model-using-skops)

- For starting with tabular regression:

  - Doing [Exploratory Data Analysis](https://neptune.ai/blog/exploratory-data-analysis-for-tabular-data) for tabular data.
    - The data considered here consists of details of Olympic athletes and medal results from Athens 1896 to Rio 2016.
    - Here you can learn more about how to explore and analyse the data and visualize them in order to get a better understanding of dataset.
  - Building your [first ML model](https://www.kaggle.com/code/dansbecker/your-first-machine-learning-model).

- Intermediate level tutorials on tabular regression:
  - [A Short Chronology of Deep Learning for Tabular Data](https://sebastianraschka.com/blog/2022/deep-learning-for-tabular-data.html) by Sebastian Raschka.

### Training your own model in just a few seconds

We have built a [baseline trainer](https://huggingface.co/spaces/scikit-learn/baseline-trainer) application to which you can drag and drop your dataset. It will train a baseline and push it to your Hugging Face Hub profile with a model card containing information about the model.

This page was made possible thanks to efforts of [Brenden Connors](https://huggingface.co/brendenc) and [Ayush Bihani](https://huggingface.co/hsuyab).
