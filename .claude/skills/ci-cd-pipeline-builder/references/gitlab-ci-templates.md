# GitLab CI Templates

## Node.js Baseline

```yaml
stages:
  - lint
  - test
  - build

node_lint:
  image: node:20
  stage: lint
  script:
    - npm ci
    - npm run lint

node_test:
  image: node:20
  stage: test
  script:
    - npm ci
    - npm test
```

## Python Baseline

```yaml
stages:
  - test

python_test:
  image: python:3.12
  stage: test
  script:
    - python3 -m pip install -U pip
    - python3 -m pip install -r requirements.txt
    - python3 -m pytest
```
