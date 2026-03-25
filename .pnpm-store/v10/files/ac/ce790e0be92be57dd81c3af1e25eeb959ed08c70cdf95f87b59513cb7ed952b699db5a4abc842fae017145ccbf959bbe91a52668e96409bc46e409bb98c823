[//]: # "This README.md file is auto-generated, all changes to this file will be lost."
[//]: # "To regenerate it, use `python -m synthtool`."
<img src="https://avatars2.githubusercontent.com/u/2810941?v=3&s=96" alt="Google Cloud Platform logo" title="Google Cloud Platform" align="right" height="96" width="96"/>

# [GCP Metadata: Node.js Client](https://github.com/googleapis/gcp-metadata)

[![release level](https://img.shields.io/badge/release%20level-general%20availability%20%28GA%29-brightgreen.svg?style=flat)](https://cloud.google.com/terms/launch-stages)
[![npm version](https://img.shields.io/npm/v/gcp-metadata.svg)](https://www.npmjs.org/package/gcp-metadata)




Get the metadata from a Google Cloud Platform environment


A comprehensive list of changes in each version may be found in
[the CHANGELOG](https://github.com/googleapis/gcp-metadata/blob/main/CHANGELOG.md).

* [GCP Metadata Node.js Client API Reference][client-docs]
* [GCP Metadata Documentation][product-docs]
* [github.com/googleapis/gcp-metadata](https://github.com/googleapis/gcp-metadata)

Read more about the client libraries for Cloud APIs, including the older
Google APIs Client Libraries, in [Client Libraries Explained][explained].

[explained]: https://cloud.google.com/apis/docs/client-libraries-explained

**Table of contents:**


* [Quickstart](#quickstart)

  * [Installing the client library](#installing-the-client-library)
  * [Using the client library](#using-the-client-library)
* [Samples](#samples)
* [Versioning](#versioning)
* [Contributing](#contributing)
* [License](#license)

## Quickstart

### Installing the client library

```bash
npm install gcp-metadata
```


### Using the client library

```javascript
const gcpMetadata = require('gcp-metadata');

async function quickstart() {
  // check to see if this code can access a metadata server
  const isAvailable = await gcpMetadata.isAvailable();
  console.log(`Is available: ${isAvailable}`);

  // Instance and Project level metadata will only be available if
  // running inside of a Google Cloud compute environment such as
  // Cloud Functions, App Engine, Kubernetes Engine, or Compute Engine.
  // To learn more about the differences between instance and project
  // level metadata, see:
  // https://cloud.google.com/compute/docs/storing-retrieving-metadata#project-instance-metadata
  if (isAvailable) {
    // grab all top level metadata from the service
    const instanceMetadata = await gcpMetadata.instance();
    console.log('Instance metadata:');
    console.log(instanceMetadata);

    // get all project level metadata
    const projectMetadata = await gcpMetadata.project();
    console.log('Project metadata:');
    console.log(projectMetadata);
  }
}

quickstart();

```

#### Check to see if the metadata server is available
```js
const isAvailable = await gcpMetadata.isAvailable();
```

#### Access all metadata

```js
const data = await gcpMetadata.instance();
console.log(data); // ... All metadata properties
```

#### Access specific properties
```js
const data = await gcpMetadata.instance('hostname');
console.log(data); // ...Instance hostname
const projectId = await gcpMetadata.project('project-id');
console.log(projectId); // ...Project ID of the running instance
```

#### Access nested properties with the relative path
```js
const data = await gcpMetadata.instance('service-accounts/default/email');
console.log(data); // ...Email address of the Compute identity service account
```

#### Access specific properties with query parameters
```js
const data = await gcpMetadata.instance({
  property: 'tags',
  params: { alt: 'text' }
});
console.log(data) // ...Tags as newline-delimited list
```

#### Access with custom headers
```js
await gcpMetadata.instance({
  headers: { 'no-trace': '1' }
}); // ...Request is untraced
```

### Take care with large number valued properties

In some cases number valued properties returned by the Metadata Service may be
too large to be representable as JavaScript numbers. In such cases we return
those values as `BigNumber` objects (from the [bignumber.js](https://github.com/MikeMcl/bignumber.js) library). Numbers
that fit within the JavaScript number range will be returned as normal number
values.

```js
const id = await gcpMetadata.instance('id');
console.log(id)  // ... BigNumber { s: 1, e: 18, c: [ 45200, 31799277581759 ] }
console.log(id.toString()) // ... 4520031799277581759
```

### Environment variables

* `GCE_METADATA_HOST`: provide an alternate host or IP to perform lookup against (useful, for example, you're connecting through a custom proxy server).

  For example:
  ```
  export GCE_METADATA_HOST = '169.254.169.254'
  ```

* `DETECT_GCP_RETRIES`: number representing number of retries that should be attempted on metadata lookup.

* `DEBUG_AUTH`: emit debugging logs

* `METADATA_SERVER_DETECTION`: configure desired metadata server availability check behavior.

  * `assume-present`: don't try to ping the metadata server, but assume it's present
  * `none`: don't try to ping the metadata server, but don't try to use it either
  * `bios-only`: treat the result of a BIOS probe as canonical (don't fall back to pinging)
  * `ping-only`: skip the BIOS probe, and go straight to pinging


## Samples

Samples are in the [`samples/`](https://github.com/googleapis/gcp-metadata/tree/main/samples) directory. Each sample's `README.md` has instructions for running its sample.

| Sample                      | Source Code                       | Try it |
| --------------------------- | --------------------------------- | ------ |
| Quickstart | [source code](https://github.com/googleapis/gcp-metadata/blob/main/samples/quickstart.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/gcp-metadata&page=editor&open_in_editor=samples/quickstart.js,samples/README.md) |



The [GCP Metadata Node.js Client API Reference][client-docs] documentation
also contains samples.

## Supported Node.js Versions

Our client libraries follow the [Node.js release schedule](https://nodejs.org/en/about/releases/).
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
For example, `npm install gcp-metadata@legacy-8` installs client libraries
for versions compatible with Node.js 8.

## Versioning

This library follows [Semantic Versioning](http://semver.org/).


This library is considered to be **General Availability (GA)**. This means it
is stable; the code surface will not change in backwards-incompatible ways
unless absolutely necessary (e.g. because of critical security issues) or with
an extensive deprecation period. Issues and requests against **GA** libraries
are addressed with the highest priority.







More Information: [Google Cloud Platform Launch Stages][launch_stages]

[launch_stages]: https://cloud.google.com/terms/launch-stages

## Contributing

Contributions welcome! See the [Contributing Guide](https://github.com/googleapis/gcp-metadata/blob/main/CONTRIBUTING.md).

Please note that this `README.md`, the `samples/README.md`,
and a variety of configuration files in this repository (including `.nycrc` and `tsconfig.json`)
are generated from a central template. To edit one of these files, make an edit
to its templates in
[directory](https://github.com/googleapis/synthtool).

## License

Apache Version 2.0

See [LICENSE](https://github.com/googleapis/gcp-metadata/blob/main/LICENSE)

[client-docs]: https://cloud.google.com/nodejs/docs/reference/gcp-metadata/latest
[product-docs]: https://cloud.google.com/compute/docs/storing-retrieving-metadata
[shell_img]: https://gstatic.com/cloudssh/images/open-btn.png
[projects]: https://console.cloud.google.com/project
[billing]: https://support.google.com/cloud/answer/6293499#enable-billing

[auth]: https://cloud.google.com/docs/authentication/getting-started
