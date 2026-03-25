[//]: # "This README.md file is auto-generated, all changes to this file will be lost."
[//]: # "To regenerate it, use `python -m synthtool`."
<img src="https://avatars2.githubusercontent.com/u/2810941?v=3&s=96" alt="Google Cloud Platform logo" title="Google Cloud Platform" align="right" height="96" width="96"/>

# [Google Cloud Resource Manager API: Node.js Client](https://github.com/googleapis/google-cloud-node/tree/main/packages/google-cloud-resourcemanager)

[![release level](https://img.shields.io/badge/release%20level-stable-brightgreen.svg?style=flat)](https://cloud.google.com/terms/launch-stages)
[![npm version](https://img.shields.io/npm/v/@google-cloud/resource-manager.svg)](https://www.npmjs.org/package/@google-cloud/resource-manager)




Cloud Resource Manager Client Library for Node.js


A comprehensive list of changes in each version may be found in
[the CHANGELOG](https://github.com/googleapis/google-cloud-node/tree/main/packages/google-cloud-resourcemanager/CHANGELOG.md).

* [Google Cloud Resource Manager API Node.js Client API Reference][client-docs]
* [Google Cloud Resource Manager API Documentation][product-docs]
* [github.com/googleapis/google-cloud-node/packages/google-cloud-resourcemanager](https://github.com/googleapis/google-cloud-node/tree/main/packages/google-cloud-resourcemanager)

Read more about the client libraries for Cloud APIs, including the older
Google APIs Client Libraries, in [Client Libraries Explained][explained].

[explained]: https://cloud.google.com/apis/docs/client-libraries-explained

**Table of contents:**


* [Quickstart](#quickstart)
  * [Before you begin](#before-you-begin)
  * [Installing the client library](#installing-the-client-library)
  * [Using the client library](#using-the-client-library)
* [Samples](#samples)
* [Versioning](#versioning)
* [Contributing](#contributing)
* [License](#license)

## Quickstart

### Before you begin

1.  [Select or create a Cloud Platform project][projects].
1.  [Enable billing for your project][billing].
1.  [Enable the Google Cloud Resource Manager API API][enable_api].
1.  [Set up authentication with a service account][auth] so you can access the
    API from your local workstation.

### Installing the client library

```bash
npm install @google-cloud/resource-manager
```


### Using the client library

```javascript
// Imports the Google Cloud client library
const {ProjectsClient} = require('@google-cloud/resource-manager');

// Creates a client
const client = new ProjectsClient();

async function quickstart() {
  // Lists current projects
  const projects = client.searchProjectsAsync();
  console.log('Projects:');
  for await (const project of projects) {
    console.info(project);
  }
}
quickstart();

```



## Samples

Samples are in the [`samples/`](https://github.com/googleapis/google-cloud-node/tree/main/packages/google-cloud-resourcemanager/samples) directory. Each sample's `README.md` has instructions for running its sample.

| Sample                      | Source Code                       | Try it |
| --------------------------- | --------------------------------- | ------ |
| Folders.create_folder | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/folders.create_folder.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/folders.create_folder.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Folders.delete_folder | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/folders.delete_folder.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/folders.delete_folder.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Folders.get_folder | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/folders.get_folder.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/folders.get_folder.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Folders.get_iam_policy | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/folders.get_iam_policy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/folders.get_iam_policy.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Folders.list_folders | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/folders.list_folders.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/folders.list_folders.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Folders.move_folder | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/folders.move_folder.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/folders.move_folder.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Folders.search_folders | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/folders.search_folders.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/folders.search_folders.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Folders.set_iam_policy | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/folders.set_iam_policy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/folders.set_iam_policy.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Folders.test_iam_permissions | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/folders.test_iam_permissions.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/folders.test_iam_permissions.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Folders.undelete_folder | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/folders.undelete_folder.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/folders.undelete_folder.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Folders.update_folder | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/folders.update_folder.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/folders.update_folder.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Organizations.get_iam_policy | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/organizations.get_iam_policy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/organizations.get_iam_policy.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Organizations.get_organization | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/organizations.get_organization.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/organizations.get_organization.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Organizations.search_organizations | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/organizations.search_organizations.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/organizations.search_organizations.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Organizations.set_iam_policy | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/organizations.set_iam_policy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/organizations.set_iam_policy.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Organizations.test_iam_permissions | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/organizations.test_iam_permissions.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/organizations.test_iam_permissions.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Projects.create_project | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/projects.create_project.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/projects.create_project.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Projects.delete_project | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/projects.delete_project.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/projects.delete_project.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Projects.get_iam_policy | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/projects.get_iam_policy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/projects.get_iam_policy.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Projects.get_project | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/projects.get_project.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/projects.get_project.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Projects.list_projects | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/projects.list_projects.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/projects.list_projects.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Projects.move_project | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/projects.move_project.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/projects.move_project.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Projects.search_projects | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/projects.search_projects.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/projects.search_projects.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Projects.set_iam_policy | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/projects.set_iam_policy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/projects.set_iam_policy.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Projects.test_iam_permissions | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/projects.test_iam_permissions.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/projects.test_iam_permissions.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Projects.undelete_project | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/projects.undelete_project.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/projects.undelete_project.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Projects.update_project | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/projects.update_project.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/projects.update_project.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_bindings.create_tag_binding | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_bindings.create_tag_binding.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_bindings.create_tag_binding.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_bindings.delete_tag_binding | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_bindings.delete_tag_binding.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_bindings.delete_tag_binding.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_bindings.list_effective_tags | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_bindings.list_effective_tags.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_bindings.list_effective_tags.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_bindings.list_tag_bindings | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_bindings.list_tag_bindings.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_bindings.list_tag_bindings.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_holds.create_tag_hold | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_holds.create_tag_hold.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_holds.create_tag_hold.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_holds.delete_tag_hold | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_holds.delete_tag_hold.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_holds.delete_tag_hold.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_holds.list_tag_holds | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_holds.list_tag_holds.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_holds.list_tag_holds.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_keys.create_tag_key | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.create_tag_key.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.create_tag_key.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_keys.delete_tag_key | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.delete_tag_key.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.delete_tag_key.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_keys.get_iam_policy | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.get_iam_policy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.get_iam_policy.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_keys.get_namespaced_tag_key | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.get_namespaced_tag_key.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.get_namespaced_tag_key.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_keys.get_tag_key | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.get_tag_key.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.get_tag_key.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_keys.list_tag_keys | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.list_tag_keys.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.list_tag_keys.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_keys.set_iam_policy | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.set_iam_policy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.set_iam_policy.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_keys.test_iam_permissions | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.test_iam_permissions.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.test_iam_permissions.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_keys.update_tag_key | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.update_tag_key.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_keys.update_tag_key.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_values.create_tag_value | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.create_tag_value.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.create_tag_value.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_values.delete_tag_value | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.delete_tag_value.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.delete_tag_value.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_values.get_iam_policy | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.get_iam_policy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.get_iam_policy.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_values.get_namespaced_tag_value | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.get_namespaced_tag_value.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.get_namespaced_tag_value.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_values.get_tag_value | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.get_tag_value.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.get_tag_value.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_values.list_tag_values | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.list_tag_values.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.list_tag_values.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_values.set_iam_policy | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.set_iam_policy.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.set_iam_policy.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_values.test_iam_permissions | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.test_iam_permissions.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.test_iam_permissions.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Tag_values.update_tag_value | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.update_tag_value.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/generated/v3/tag_values.update_tag_value.js,packages/google-cloud-resourcemanager/samples/README.md) |
| Quickstart | [source code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-resourcemanager/samples/quickstart.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-cloud-node&page=editor&open_in_editor=packages/google-cloud-resourcemanager/samples/quickstart.js,packages/google-cloud-resourcemanager/samples/README.md) |



The [Google Cloud Resource Manager API Node.js Client API Reference][client-docs] documentation
also contains samples.

## Supported Node.js Versions

Our client libraries follow the [Node.js release schedule](https://github.com/nodejs/release#release-schedule).
Libraries are compatible with all current _active_ and _maintenance_ versions of
Node.js.
If you are using an end-of-life version of Node.js, we recommend that you update
as soon as possible to an actively supported LTS version.

Google's client libraries support legacy versions of Node.js runtimes on a
best-efforts basis with the following warnings:

* Legacy versions are not tested in continuous integration.
* Some security patches and features cannot be backported.
* Dependencies cannot be kept up-to-date.

Client libraries targeting some end-of-life versions of Node.js are available, and
can be installed through npm [dist-tags](https://docs.npmjs.com/cli/dist-tag).
The dist-tags follow the naming convention `legacy-(version)`.
For example, `npm install @google-cloud/resource-manager@legacy-8` installs client libraries
for versions compatible with Node.js 8.

## Versioning

This library follows [Semantic Versioning](http://semver.org/).



This library is considered to be **stable**. The code surface will not change in backwards-incompatible ways
unless absolutely necessary (e.g. because of critical security issues) or with
an extensive deprecation period. Issues and requests against **stable** libraries
are addressed with the highest priority.






More Information: [Google Cloud Platform Launch Stages][launch_stages]

[launch_stages]: https://cloud.google.com/terms/launch-stages

## Contributing

Contributions welcome! See the [Contributing Guide](https://github.com/googleapis/google-cloud-node/blob/main/CONTRIBUTING.md).

Please note that this `README.md`, the `samples/README.md`,
and a variety of configuration files in this repository (including `.nycrc` and `tsconfig.json`)
are generated from a central template. To edit one of these files, make an edit
to its templates in
[directory](https://github.com/googleapis/synthtool).

## License

Apache Version 2.0

See [LICENSE](https://github.com/googleapis/google-cloud-node/blob/main/LICENSE)

[client-docs]: https://cloud.google.com/nodejs/docs/reference/resource-manager/latest
[product-docs]: https://cloud.google.com/resource-manager
[shell_img]: https://gstatic.com/cloudssh/images/open-btn.png
[projects]: https://console.cloud.google.com/project
[billing]: https://support.google.com/cloud/answer/6293499#enable-billing
[enable_api]: https://console.cloud.google.com/flows/enableapi?apiid=cloudresourcemanager.googleapis.com
[auth]: https://cloud.google.com/docs/authentication/getting-started
