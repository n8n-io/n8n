import sys
import json
import base64
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import os

def draw_matrix(data_json, target_column, title, type_matrix, output_file):
    # Convert JSON data to DataFrame
    df = pd.DataFrame(data_json)
    if target_column is not None:
        X = df.drop(columns=[target_column])

    if type_matrix == "bar":
        num_columns = df.shape[1]
        plt.figure(figsize=(15, num_columns * 3))
        for i, column in enumerate(df.columns):
            plt.subplot(num_columns, 1, i + 1)
            plt.bar(range(len(df)), df[column], color='skyblue')
            plt.title(title)
            plt.xlabel('Index')
            plt.ylabel(column)
        plt.tight_layout()
        plt.savefig(output_file)
        plt.close()

    elif type_matrix == "pie":
        num_columns = df.shape[1]
        plt.figure(figsize=(15, num_columns * 3))
        for i, column in enumerate(df.columns):
            plt.subplot(num_columns, 1, i + 1)
            plt.pie(df[column], labels=df.index, autopct='%1.1f%%', startangle=90)
            plt.title(title)
        plt.tight_layout()
        plt.savefig(output_file)
        plt.close()

    elif type_matrix == "scatter":
        num_columns = df.shape[1]
        plt.figure(figsize=(15, num_columns * 3))
        for i, column in enumerate(df.columns):
            plt.subplot(num_columns, 1, i + 1)
            plt.scatter(range(len(df)), df[column], color='skyblue')
            plt.title(title)
            plt.xlabel('Index')
            plt.ylabel(column)
        plt.tight_layout()
        plt.savefig(output_file)
        plt.close()

    elif type_matrix == "box":
        num_columns = df.shape[1]
        plt.figure(figsize=(15, num_columns * 3))
        for i, column in enumerate(df.columns):
            plt.subplot(num_columns, 1, i + 1)
            plt.boxplot(df[column])
            plt.title(title)
            plt.ylabel(column)
        plt.tight_layout()
        plt.savefig(output_file)
        plt.close()

    elif type_matrix == "heatmap":
        plt.figure(figsize=(10, 10))
        sns.heatmap(X.corr(), annot=True, cmap='coolwarm', fmt=".2f")
        plt.title('Correlation Matrix')
        plt.savefig(output_file)
        plt.close()

if __name__ == "__main__":
    # Get JSON data from stdin
    input_data = json.loads(sys.stdin.read())
    target_column = input_data["target_column"]
    data_json = input_data["data"]
    title = input_data["title"]
    type_matrix = input_data["type_matrix"]
    output_file = input_data["output_file"]

    # Generate the matrix
    draw_matrix(data_json, target_column, title, type_matrix, output_file)

    # Encode the file as Base64 to return it
    with open(output_file, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode("utf-8")

    # Output Base64 data
    print(json.dumps({"file": encoded_string, "filename": output_file}))
