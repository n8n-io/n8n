from setuptools import setup, find_packages

setup(
    name="test-python-project",
    version="1.0.0",
    description="Test fixture for python project detection",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "requests",
        "pytest",
    ],
)
