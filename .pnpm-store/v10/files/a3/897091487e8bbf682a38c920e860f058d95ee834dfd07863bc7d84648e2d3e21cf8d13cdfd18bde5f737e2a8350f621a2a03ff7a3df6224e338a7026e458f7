# Contributing to IBM watsonx.ai Node.js SDK

Thank you for your interest in contributing to the IBM watsonx.ai Node.js SDK! We welcome contributions from the community.

# Questions
If you are having problems using the APIs or have a question about IBM Cloud services,
please ask a question at
[Stack Overflow](http://stackoverflow.com/questions/ask?tags=ibm-cloud).

# Issues
If you encounter an issue with the SDK, you are welcome to submit
a [bug report](https://github.com/IBM/watsonx-ai-node-sdk/issues).
Before that, please search for similar issues. It's possible someone has
already encountered this issue.

# General Information
In order to contribute to this project please follow these instructions.

## Development Setup
1. Fork the repository and clone it locally
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Run linting: `npm run lint`
5. Run formatting: `npm run format`

## Prerequisites
- Node.js >= 20.0.0
- npm (comes with Node.js)
- Git

## Commit Message Guidelines
We follow the [Angular Commit Message Guidelines](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-guidelines).

**Type** must be one of:
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files

## Pull Requests
1. Fill out the PR [template](/.github/pull_request_template.md) - check proper boxes, describe your changes
2. Link related issues in the description
3. One feature per PR - always provide unit and integration tests
4. Provide inline JSDoc documentation; during release it will be auto-generated in [GitHub Pages](https://ibm.github.io/watsonx-ai-node-sdk/)
5. Run local checks: `npm run lint`, `npm run format`, and for test runs check the [Tests](#tests) section
6. Ensure all tests pass before submitting
7. Keep PRs focused and reasonably sized for easier review

## Coding Standards
- Follow the existing code style in the project
- Use TypeScript for all new code
- Write clear, self-documenting code with meaningful variable names
- Add JSDoc comments for public APIs
- Keep functions focused and reasonably sized
- Handle errors appropriately
- Avoid using `any` type unless absolutely necessary

## Tests
In `@ibm-cloud/watsonx-ai` we focus on unit and integration tests. For each added feature, we require you to provide these tests.

### Unit Tests
To run unit tests: `npm run test-unit`

### Integration Tests
To run integration tests, you need to create a `/credentials/watsonx_ai_ml_vml_v1.env` file with credentials as shown in the credential templates:

- [SaaS](/credentials/watsonx_ai_ml_vml_v1.env.template)
- [IBM watsonx.ai software](/credentials/watsonx_ai_ml_vml_v1_cp4d.env.template)
- [Bearer token](/credentials/watsonx_ai_ml_vml_v1_bearer.env.template)
- [AWS](/credentials/watsonx_ai_ml_vml_v1_aws.env.template)

Then run: `npm run test-integration`

### Visual Studio Code Integration
This repository supports the integrated Testing feature in Visual Studio Code. Install the `Jest` extension from the Extensions tab in VS Code to easily run tests via the UI.

### Regression Tests
We provide regression tests against our IBM Langchain.js implementation in the test folder. To run them: `npm run test-regression`

### Test Coverage
- Aim for high test coverage on new code
- Include both positive and negative test cases
- Test edge cases and error conditions

## Documentation
- Update relevant documentation when adding or changing features
- Keep the README.md up to date
- Add JSDoc comments for all public APIs
- Include code examples in documentation where appropriate
- Documentation is auto-generated from JSDoc comments and published to [GitHub Pages](https://ibm.github.io/watsonx-ai-node-sdk/)

# Examples
To see examples of how to use this SDK, visit the [examples folder](examples) and read the [README.md](examples/README.md) file.

We expect each example to be 'ready-to-go' and able to run out of the box. For each added example, you must add it to the [test suite](/examples/test/).

Examples use the same `.env` file as the SDK tests.

## Review Process
1. All PRs require an approval from a maintainer
2. CI checks must pass before merging
3. Address all review comments
4. Keep your PR up to date with the main branch

## Release Process
Releases are managed by project maintainers. The project uses semantic versioning and automated release processes.

## Getting Help
- Check existing [issues](https://github.com/IBM/watsonx-ai-node-sdk/issues) and [pull requests](https://github.com/IBM/watsonx-ai-node-sdk/pulls)
- Review the [documentation](https://ibm.github.io/watsonx-ai-node-sdk/)
- Ask questions on [Stack Overflow](http://stackoverflow.com/questions/ask?tags=ibm-cloud) with the `ibm-cloud` tag

## License
By contributing to this project, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
