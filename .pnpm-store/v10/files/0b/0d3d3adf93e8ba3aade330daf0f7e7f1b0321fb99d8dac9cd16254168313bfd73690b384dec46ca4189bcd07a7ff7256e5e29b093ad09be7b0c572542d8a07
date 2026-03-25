[//]: # "This README.md file is auto-generated, all changes to this file will be lost."
[//]: # "To regenerate it, use `python -m synthtool`."
<img src="https://avatars2.githubusercontent.com/u/2810941?v=3&s=96" alt="Google Cloud Platform logo" title="Google Cloud Platform" align="right" height="96" width="96"/>

# [Google Auth Library: Node.js Client](https://github.com/googleapis/google-auth-library-nodejs)

[![release level](https://img.shields.io/badge/release%20level-stable-brightgreen.svg?style=flat)](https://cloud.google.com/terms/launch-stages)
[![npm version](https://img.shields.io/npm/v/google-auth-library.svg)](https://www.npmjs.org/package/google-auth-library)




This is Google's officially supported [node.js](http://nodejs.org/) client library for using OAuth 2.0 authorization and authentication with Google APIs.


A comprehensive list of changes in each version may be found in
[the CHANGELOG](https://github.com/googleapis/google-auth-library-nodejs/blob/main/CHANGELOG.md).

* [Google Auth Library Node.js Client API Reference][client-docs]
* [Google Auth Library Documentation][product-docs]
* [github.com/googleapis/google-auth-library-nodejs](https://github.com/googleapis/google-auth-library-nodejs)

Read more about the client libraries for Cloud APIs, including the older
Google APIs Client Libraries, in [Client Libraries Explained][explained].

[explained]: https://cloud.google.com/apis/docs/client-libraries-explained

**Table of contents:**


* [Quickstart](#quickstart)

  * [Installing the client library](#installing-the-client-library)

* [Samples](#samples)
* [Versioning](#versioning)
* [Contributing](#contributing)
* [License](#license)

## Quickstart

### Installing the client library

```bash
npm install google-auth-library
```

## Ways to authenticate
This library provides a variety of ways to authenticate to your Google services.
- [Application Default Credentials](#choosing-the-correct-credential-type-automatically) - Use Application Default Credentials when you use a single identity for all users in your application. Especially useful for applications running on Google Cloud. Application Default Credentials also support workload identity federation to access Google Cloud resources from non-Google Cloud platforms.
- [OAuth 2](#oauth2) - Use OAuth2 when you need to perform actions on behalf of the end user.
- [JSON Web Tokens](#json-web-tokens) - Use JWT when you are using a single identity for all users. Especially useful for server->server or server->API communication.
- [Google Compute](#compute) - Directly use a service account on Google Cloud Platform. Useful for server->server or server->API communication.
- [Workload Identity Federation](#workload-identity-federation) - Use workload identity federation to access Google Cloud resources from Amazon Web Services (AWS), Microsoft Azure or any identity provider that supports OpenID Connect (OIDC).
- [Workforce Identity Federation](#workforce-identity-federation) - Use workforce identity federation to access Google Cloud resources using an external identity provider (IdP) to authenticate and authorize a workforce—a group of users, such as employees, partners, and contractors—using IAM, so that the users can access Google Cloud services.
- [Impersonated Credentials Client](#impersonated-credentials-client) - access protected resources on behalf of another service account.
- [Downscoped Client](#downscoped-client) - Use Downscoped Client with Credential Access Boundary to generate a short-lived credential with downscoped, restricted IAM permissions that can use for Cloud Storage.

## Application Default Credentials
This library provides an implementation of [Application Default Credentials](https://cloud.google.com/docs/authentication/getting-started) for Node.js. The [Application Default Credentials](https://cloud.google.com/docs/authentication/getting-started) provide a simple way to get authorization credentials for use in calling Google APIs.

They are best suited for cases when the call needs to have the same identity and authorization level for the application independent of the user. This is the recommended approach to authorize calls to Cloud APIs, particularly when you're building an application that uses Google Cloud Platform.

Application Default Credentials also support workload identity federation to access Google Cloud resources from non-Google Cloud platforms including Amazon Web Services (AWS), Microsoft Azure or any identity provider that supports OpenID Connect (OIDC). Workload identity federation is recommended for non-Google Cloud environments as it avoids the need to download, manage and store service account private keys locally, see: [Workload Identity Federation](#workload-identity-federation).

#### Download your Service Account Credentials JSON file

To use Application Default Credentials, You first need to download a set of JSON credentials for your project. Go to **APIs & Auth** > **Credentials** in the [Google Developers Console](https://console.cloud.google.com/) and select **Service account** from the **Add credentials** dropdown.

> This file is your *only copy* of these credentials. It should never be
> committed with your source code, and should be stored securely.

Once downloaded, store the path to this file in the `GOOGLE_APPLICATION_CREDENTIALS` environment variable.

#### Enable the API you want to use

Before making your API call, you must be sure the API you're calling has been enabled. Go to **APIs & Auth** > **APIs** in the [Google Developers Console](https://console.cloud.google.com/) and enable the APIs you'd like to call. For the example below, you must enable the `DNS API`.


#### Choosing the correct credential type automatically

Rather than manually creating an OAuth2 client, JWT client, or Compute client, the auth library can create the correct credential type for you, depending upon the environment your code is running under.

For example, a JWT auth client will be created when your code is running on your local developer machine, and a Compute client will be created when the same code is running on Google Cloud Platform. If you need a specific set of scopes, you can pass those in the form of a string or an array to the `GoogleAuth` constructor.

The code below shows how to retrieve a default credential type, depending upon the runtime environment.

```js
const {GoogleAuth} = require('google-auth-library');

/**
* Instead of specifying the type of client you'd like to use (JWT, OAuth2, etc)
* this library will automatically choose the right client based on the environment.
*/
async function main() {
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
  });
  const client = await auth.getClient();
  const projectId = await auth.getProjectId();
  const url = `https://dns.googleapis.com/dns/v1/projects/${projectId}`;
  const res = await client.request({ url });
  console.log(res.data);
}

main().catch(console.error);
```

## OAuth2

This library comes with an [OAuth2](https://developers.google.com/identity/protocols/OAuth2) client that allows you to retrieve an access token and refreshes the token and retry the request seamlessly if you also provide an `expiry_date` and the token is expired. The basics of Google's OAuth2 implementation is explained on [Google Authorization and Authentication documentation](https://developers.google.com/accounts/docs/OAuth2Login).

In the following examples, you may need a `CLIENT_ID`, `CLIENT_SECRET` and `REDIRECT_URL`. You can find these pieces of information by going to the [Developer Console](https://console.cloud.google.com/), clicking your project > APIs & auth > credentials.

For more information about OAuth2 and how it works, [see here](https://developers.google.com/identity/protocols/OAuth2).

#### A complete OAuth2 example

Let's take a look at a complete example.

``` js
const {OAuth2Client} = require('google-auth-library');
const http = require('http');
const url = require('url');
const open = require('open');
const destroyer = require('server-destroy');

// Download your OAuth2 configuration from the Google
const keys = require('./oauth2.keys.json');

/**
* Start by acquiring a pre-authenticated oAuth2 client.
*/
async function main() {
  const oAuth2Client = await getAuthenticatedClient();
  // Make a simple request to the People API using our pre-authenticated client. The `request()` method
  // takes an GaxiosOptions object.  Visit https://github.com/JustinBeckwith/gaxios.
  const url = 'https://people.googleapis.com/v1/people/me?personFields=names';
  const res = await oAuth2Client.request({url});
  console.log(res.data);

  // After acquiring an access_token, you may want to check on the audience, expiration,
  // or original scopes requested.  You can do that with the `getTokenInfo` method.
  const tokenInfo = await oAuth2Client.getTokenInfo(
    oAuth2Client.credentials.access_token
  );
  console.log(tokenInfo);
}

/**
* Create a new OAuth2Client, and go through the OAuth2 content
* workflow.  Return the full client to the callback.
*/
function getAuthenticatedClient() {
  return new Promise((resolve, reject) => {
    // create an oAuth client to authorize the API call.  Secrets are kept in a `keys.json` file,
    // which should be downloaded from the Google Developers Console.
    const oAuth2Client = new OAuth2Client(
      keys.web.client_id,
      keys.web.client_secret,
      keys.web.redirect_uris[0]
    );

    // Generate the url that will be used for the consent dialog.
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/userinfo.profile',
    });

    // Open an http server to accept the oauth callback. In this simple example, the
    // only request to our webserver is to /oauth2callback?code=<code>
    const server = http
      .createServer(async (req, res) => {
        try {
          if (req.url.indexOf('/oauth2callback') > -1) {
            // acquire the code from the querystring, and close the web server.
            const qs = new url.URL(req.url, 'http://localhost:3000')
              .searchParams;
            const code = qs.get('code');
            console.log(`Code is ${code}`);
            res.end('Authentication successful! Please return to the console.');
            server.destroy();

            // Now that we have the code, use that to acquire tokens.
            const r = await oAuth2Client.getToken(code);
            // Make sure to set the credentials on the OAuth2 client.
            oAuth2Client.setCredentials(r.tokens);
            console.info('Tokens acquired.');
            resolve(oAuth2Client);
          }
        } catch (e) {
          reject(e);
        }
      })
      .listen(3000, () => {
        // open the browser to the authorize url to start the workflow
        open(authorizeUrl, {wait: false}).then(cp => cp.unref());
      });
    destroyer(server);
  });
}

main().catch(console.error);
```

#### Handling token events

This library will automatically obtain an `access_token`, and automatically refresh the `access_token` if a `refresh_token` is present.  The `refresh_token` is only returned on the [first authorization](https://github.com/googleapis/google-api-nodejs-client/issues/750#issuecomment-304521450), so if you want to make sure you store it safely. An easy way to make sure you always store the most recent tokens is to use the `tokens` event:

```js
const client = await auth.getClient();

client.on('tokens', (tokens) => {
  if (tokens.refresh_token) {
    // store the refresh_token in my database!
    console.log(tokens.refresh_token);
  }
  console.log(tokens.access_token);
});

const url = `https://dns.googleapis.com/dns/v1/projects/${projectId}`;
const res = await client.request({ url });
// The `tokens` event would now be raised if this was the first request
```

#### Retrieve access token
With the code returned, you can ask for an access token as shown below:

``` js
const tokens = await oauth2Client.getToken(code);
// Now tokens contains an access_token and an optional refresh_token. Save them.
oauth2Client.setCredentials(tokens);
```

#### Obtaining a new Refresh Token
If you need to obtain a new `refresh_token`, ensure the call to `generateAuthUrl` sets the `access_type` to `offline`.  The refresh token will only be returned for the first authorization by the user.  To force consent, set the `prompt` property to `consent`:

```js
// Generate the url that will be used for the consent dialog.
const authorizeUrl = oAuth2Client.generateAuthUrl({
  // To get a refresh token, you MUST set access_type to `offline`.
  access_type: 'offline',
  // set the appropriate scopes
  scope: 'https://www.googleapis.com/auth/userinfo.profile',
  // A refresh token is only returned the first time the user
  // consents to providing access.  For illustration purposes,
  // setting the prompt to 'consent' will force this consent
  // every time, forcing a refresh_token to be returned.
  prompt: 'consent'
});
```

#### Checking `access_token` information
After obtaining and storing an `access_token`, at a later time you may want to go check the expiration date,
original scopes, or audience for the token.  To get the token info, you can use the `getTokenInfo` method:

```js
// after acquiring an oAuth2Client...
const tokenInfo = await oAuth2Client.getTokenInfo('my-access-token');

// take a look at the scopes originally provisioned for the access token
console.log(tokenInfo.scopes);
```

This method will throw if the token is invalid.

#### Using an API Key

An API key can be provided to the constructor:
```js
const client = new OAuth2Client({
  apiKey: 'my-api-key'
});
```

Note, classes that extend from this can utilize this parameter as well, such as `JWT` and `UserRefreshClient`.

Additionally, an API key can be used in `GoogleAuth` via the `clientOptions` parameter and will be passed to any generated `OAuth2Client` instances:
```js
const auth = new GoogleAuth({
  clientOptions: {
    apiKey: 'my-api-key'
  }
})
```

API Key support varies by API.

## JSON Web Tokens
The Google Developers Console provides a `.json` file that you can use to configure a JWT auth client and authenticate your requests, for example when using a service account.

``` js
const {JWT} = require('google-auth-library');
const keys = require('./jwt.keys.json');

async function main() {
  const client = new JWT({
    email: keys.client_email,
    key: keys.private_key,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const url = `https://dns.googleapis.com/dns/v1/projects/${keys.project_id}`;
  const res = await client.request({url});
  console.log(res.data);
}

main().catch(console.error);
```

The parameters for the JWT auth client including how to use it with a `.pem` file are explained in [samples/jwt.js](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/jwt.js).

#### Loading credentials from environment variables
Instead of loading credentials from a key file, you can also provide them using an environment variable and the `GoogleAuth.fromJSON()` method.  This is particularly convenient for systems that deploy directly from source control (Heroku, App Engine, etc).

Start by exporting your credentials:

```
$ export CREDS='{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "your-private-key",
  "client_email": "your-client-email",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://accounts.google.com/o/oauth2/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "your-cert-url"
}'
```
Now you can create a new client from the credentials:

```js
const {auth} = require('google-auth-library');

// load the environment variable with our keys
const keysEnvVar = process.env['CREDS'];
if (!keysEnvVar) {
  throw new Error('The $CREDS environment variable was not found!');
}
const keys = JSON.parse(keysEnvVar);

async function main() {
  // load the JWT or UserRefreshClient from the keys
  const client = auth.fromJSON(keys);
  client.scopes = ['https://www.googleapis.com/auth/cloud-platform'];
  const url = `https://dns.googleapis.com/dns/v1/projects/${keys.project_id}`;
  const res = await client.request({url});
  console.log(res.data);
}

main().catch(console.error);
```

**Important**: If you accept a credential configuration (credential JSON/File/Stream) from an external source for authentication to Google Cloud, you must validate it before providing it to any Google API or library. Providing an unvalidated credential configuration to Google APIs can compromise the security of your systems and data. For more information, refer to [Validate credential configurations from external sources](https://cloud.google.com/docs/authentication/external/externally-sourced-credentials).

#### Using a Proxy
You can set the `HTTPS_PROXY` or `https_proxy` environment variables to proxy HTTPS requests. When `HTTPS_PROXY` or `https_proxy` are set, they will be used to proxy SSL requests that do not have an explicit proxy configuration option present.

## Compute
If your application is running on Google Cloud Platform, you can authenticate using the default service account or by specifying a specific service account.

**Note**: In most cases, you will want to use [Application Default Credentials](#choosing-the-correct-credential-type-automatically).  Direct use of the `Compute` class is for very specific scenarios.

``` js
const {auth, Compute} = require('google-auth-library');

async function main() {
  const client = new Compute({
    // Specifying the service account email is optional.
    serviceAccountEmail: 'my-service-account@example.com'
  });
  const projectId = await auth.getProjectId();
  const url = `https://dns.googleapis.com/dns/v1/projects/${projectId}`;
  const res = await client.request({url});
  console.log(res.data);
}

main().catch(console.error);
```

## Workload Identity Federation

Using workload identity federation, your application can access Google Cloud resources from Amazon Web Services (AWS), Microsoft Azure or any identity provider that supports OpenID Connect (OIDC).

Traditionally, applications running outside Google Cloud have used service account keys to access Google Cloud resources. Using identity federation, you can allow your workload to impersonate a service account.
This lets you access Google Cloud resources directly, eliminating the maintenance and security burden associated with service account keys.

### Accessing resources from AWS

In order to access Google Cloud resources from Amazon Web Services (AWS), the following requirements are needed:
- A workload identity pool needs to be created.
- AWS needs to be added as an identity provider in the workload identity pool (The Google [organization policy](https://cloud.google.com/iam/docs/manage-workload-identity-pools-providers#restrict) needs to allow federation from AWS).
- Permission to impersonate a service account needs to be granted to the external identity.

Follow the detailed [instructions](https://cloud.google.com/iam/docs/access-resources-aws) on how to configure workload identity federation from AWS.

After configuring the AWS provider to impersonate a service account, a credential configuration file needs to be generated.
Unlike service account credential files, the generated credential configuration file will only contain non-sensitive metadata to instruct the library on how to retrieve external subject tokens and exchange them for service account access tokens.
The configuration file can be generated by using the [gcloud CLI](https://cloud.google.com/sdk/).

To generate the AWS workload identity configuration, run the following command:

```bash
# Generate an AWS configuration file.
gcloud iam workload-identity-pools create-cred-config \
    projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$AWS_PROVIDER_ID \
    --service-account $SERVICE_ACCOUNT_EMAIL \
    --aws \
    --output-file /path/to/generated/config.json
```

Where the following variables need to be substituted:
- `$PROJECT_NUMBER`: The Google Cloud project number.
- `$POOL_ID`: The workload identity pool ID.
- `$AWS_PROVIDER_ID`: The AWS provider ID.
- `$SERVICE_ACCOUNT_EMAIL`: The email of the service account to impersonate.

This will generate the configuration file in the specified output file.

If you want to use the AWS IMDSv2 flow, you can add the field below to the credential_source in your AWS ADC configuration file:
"imdsv2_session_token_url": "http://169.254.169.254/latest/api/token"
The gcloud create-cred-config command will be updated to support this soon.

You can now [start using the Auth library](#using-external-identities) to call Google Cloud resources from AWS.

### Accessing resources from AWS using a custom AWS security credentials supplier.

In order to access Google Cloud resources from Amazon Web Services (AWS), the following requirements are needed:
- A workload identity pool needs to be created.
- AWS needs to be added as an identity provider in the workload identity pool (The Google [organization policy](https://cloud.google.com/iam/docs/manage-workload-identity-pools-providers#restrict) needs to allow federation from AWS).
- Permission to impersonate a service account needs to be granted to the external identity.

Follow the detailed [instructions](https://cloud.google.com/iam/docs/access-resources-aws) on how to configure workload identity federation from AWS.

If you want to use AWS security credentials that cannot be retrieved using methods supported natively by this library,
a custom AwsSecurityCredentialsSupplier implementation may be specified when creating an AWS client. The supplier must
return valid, unexpired AWS security credentials when called by the GCP credential. Currently, using ADC with your AWS
workloads is only supported with EC2. An example of a good use case for using a custom credential suppliers is when
your workloads are running in other AWS environments, such as ECS, EKS, Fargate, etc.

Note that the client does not cache the returned AWS security credentials, so caching logic should be implemented in the supplier to prevent multiple requests for the same resources.

```ts
import { AwsClient, AwsSecurityCredentials, AwsSecurityCredentialsSupplier, ExternalAccountSupplierContext } from 'google-auth-library';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { Storage } from '@google-cloud/storage';

class AwsSupplier implements AwsSecurityCredentialsSupplier {
  private readonly region: string

  constructor(region: string) {
    this.region = options.region;
  }

  async getAwsRegion(context: ExternalAccountSupplierContext): Promise<string> {
    // Return the AWS region i.e. "us-east-2".
    return this.region
  }

  async getAwsSecurityCredentials(
    context: ExternalAccountSupplierContext
  ): Promise<AwsSecurityCredentials> {
    // Retrieve the AWS credentails.
    const awsCredentialsProvider = fromNodeProviderChain();
    const awsCredentials = await awsCredentialsProvider();

    // Parse the AWS credentials into a AWS security credentials instance and
    // return them.
    const awsSecurityCredentials = {
      accessKeyId: awsCredentials.accessKeyId,
      secretAccessKey: awsCredentials.secretAccessKey,
      token: awsCredentials.sessionToken
    }
    return awsSecurityCredentials;
  }
}

const clientOptions = {
  audience: '//iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$WORKLOAD_POOL_ID/providers/$PROVIDER_ID', // Set the GCP audience.
  subject_token_type: 'urn:ietf:params:aws:token-type:aws4_request', // Set the subject token type.
  aws_security_credentials_supplier: new AwsSupplier("AWS_REGION") // Set the custom supplier.
  service_account_impersonation_url: 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/$EMAIL:generateAccessToken', // Set the service account impersonation url.
}

// Create a new Auth client and use it to create service client, i.e. storage.
const authClient = new AwsClient(clientOptions);
const storage = new Storage({ authClient });
```

Where the [audience](https://cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation#provider-audience) is: `//iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$WORKLOAD_POOL_ID/providers/$PROVIDER_ID`

Where the following variables need to be substituted:

* `$PROJECT_NUMBER`: The Google Cloud project number.
* `$WORKLOAD_POOL_ID`: The workload pool ID.
* `$PROVIDER_ID`: The provider ID.


The values for audience, service account impersonation URL, and any other builder field can also be found by generating a [credential configuration file with the gcloud CLI](https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/create-cred-config).

### Access resources from Microsoft Azure

In order to access Google Cloud resources from Microsoft Azure, the following requirements are needed:
- A workload identity pool needs to be created.
- Azure needs to be added as an identity provider in the workload identity pool (The Google [organization policy](https://cloud.google.com/iam/docs/manage-workload-identity-pools-providers#restrict) needs to allow federation from Azure).
- The Azure tenant needs to be configured for identity federation.
- Permission to impersonate a service account needs to be granted to the external identity.

Follow the detailed [instructions](https://cloud.google.com/iam/docs/access-resources-azure) on how to configure workload identity federation from Microsoft Azure.

After configuring the Azure provider to impersonate a service account, a credential configuration file needs to be generated.
Unlike service account credential files, the generated credential configuration file will only contain non-sensitive metadata to instruct the library on how to retrieve external subject tokens and exchange them for service account access tokens.
The configuration file can be generated by using the [gcloud CLI](https://cloud.google.com/sdk/).

To generate the Azure workload identity configuration, run the following command:

```bash
# Generate an Azure configuration file.
gcloud iam workload-identity-pools create-cred-config \
    projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$AZURE_PROVIDER_ID \
    --service-account $SERVICE_ACCOUNT_EMAIL \
    --azure \
    --output-file /path/to/generated/config.json
```

Where the following variables need to be substituted:
- `$PROJECT_NUMBER`: The Google Cloud project number.
- `$POOL_ID`: The workload identity pool ID.
- `$AZURE_PROVIDER_ID`: The Azure provider ID.
- `$SERVICE_ACCOUNT_EMAIL`: The email of the service account to impersonate.

This will generate the configuration file in the specified output file.

You can now [start using the Auth library](#using-external-identities) to call Google Cloud resources from Azure.

### Accessing resources from an OIDC identity provider

In order to access Google Cloud resources from an identity provider that supports [OpenID Connect (OIDC)](https://openid.net/connect/), the following requirements are needed:
- A workload identity pool needs to be created.
- An OIDC identity provider needs to be added in the workload identity pool (The Google [organization policy](https://cloud.google.com/iam/docs/manage-workload-identity-pools-providers#restrict) needs to allow federation from the identity provider).
- Permission to impersonate a service account needs to be granted to the external identity.

Follow the detailed [instructions](https://cloud.google.com/iam/docs/access-resources-oidc) on how to configure workload identity federation from an OIDC identity provider.

After configuring the OIDC provider to impersonate a service account, a credential configuration file needs to be generated.
Unlike service account credential files, the generated credential configuration file will only contain non-sensitive metadata to instruct the library on how to retrieve external subject tokens and exchange them for service account access tokens.
The configuration file can be generated by using the [gcloud CLI](https://cloud.google.com/sdk/).

For OIDC providers, the Auth library can retrieve OIDC tokens either from a local file location (file-sourced credentials) or from a local server (URL-sourced credentials).

**File-sourced credentials**
For file-sourced credentials, a background process needs to be continuously refreshing the file location with a new OIDC token prior to expiration.
For tokens with one hour lifetimes, the token needs to be updated in the file every hour. The token can be stored directly as plain text or in JSON format.

To generate a file-sourced OIDC configuration, run the following command:

```bash
# Generate an OIDC configuration file for file-sourced credentials.
gcloud iam workload-identity-pools create-cred-config \
    projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$OIDC_PROVIDER_ID \
    --service-account $SERVICE_ACCOUNT_EMAIL \
    --credential-source-file $PATH_TO_OIDC_ID_TOKEN \
    # Optional arguments for file types. Default is "text":
    # --credential-source-type "json" \
    # Optional argument for the field that contains the OIDC credential.
    # This is required for json.
    # --credential-source-field-name "id_token" \
    --output-file /path/to/generated/config.json
```

Where the following variables need to be substituted:
- `$PROJECT_NUMBER`: The Google Cloud project number.
- `$POOL_ID`: The workload identity pool ID.
- `$OIDC_PROVIDER_ID`: The OIDC provider ID.
- `$SERVICE_ACCOUNT_EMAIL`: The email of the service account to impersonate.
- `$PATH_TO_OIDC_ID_TOKEN`: The file path where the OIDC token will be retrieved from.

This will generate the configuration file in the specified output file.

**URL-sourced credentials**
For URL-sourced credentials, a local server needs to host a GET endpoint to return the OIDC token. The response can be in plain text or JSON.
Additional required request headers can also be specified.

To generate a URL-sourced OIDC workload identity configuration, run the following command:

```bash
# Generate an OIDC configuration file for URL-sourced credentials.
gcloud iam workload-identity-pools create-cred-config \
    projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$OIDC_PROVIDER_ID \
    --service-account $SERVICE_ACCOUNT_EMAIL \
    --credential-source-url $URL_TO_GET_OIDC_TOKEN \
    --credential-source-headers $HEADER_KEY=$HEADER_VALUE \
    # Optional arguments for file types. Default is "text":
    # --credential-source-type "json" \
    # Optional argument for the field that contains the OIDC credential.
    # This is required for json.
    # --credential-source-field-name "id_token" \
    --output-file /path/to/generated/config.json
```

Where the following variables need to be substituted:
- `$PROJECT_NUMBER`: The Google Cloud project number.
- `$POOL_ID`: The workload identity pool ID.
- `$OIDC_PROVIDER_ID`: The OIDC provider ID.
- `$SERVICE_ACCOUNT_EMAIL`: The email of the service account to impersonate.
- `$URL_TO_GET_OIDC_TOKEN`: The URL of the local server endpoint to call to retrieve the OIDC token.
- `$HEADER_KEY` and `$HEADER_VALUE`: The additional header key/value pairs to pass along the GET request to `$URL_TO_GET_OIDC_TOKEN`, e.g. `Metadata-Flavor=Google`.

### Accessing resources from an OIDC or SAML2.0 identity provider using a custom supplier

If you want to use OIDC or SAML2.0 that cannot be retrieved using methods supported natively by this library,
a custom SubjectTokenSupplier implementation may be specified when creating an identity pool client. The supplier must
return a valid, unexpired subject token when called by the GCP credential.

Note that the client does not cache the returned subject token, so caching logic should be implemented in the supplier to prevent multiple requests for the same resources.

```ts
class CustomSupplier implements SubjectTokenSupplier {
  async getSubjectToken(
    context: ExternalAccountSupplierContext
  ): Promise<string> {
    const audience = context.audience;
    const subjectTokenType = context.subjectTokenType;
    // Return a valid subject token for the requested audience and subject token type.
  }
}

const clientOptions = {
  audience: '//iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$WORKLOAD_POOL_ID/providers/$PROVIDER_ID', // Set the GCP audience.
  subject_token_type: 'urn:ietf:params:oauth:token-type:id_token', // Set the subject token type.
  subject_token_supplier: new CustomSupplier() // Set the custom supplier.
}

const client = new CustomSupplier(clientOptions);
```

Where the [audience](https://cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation#provider-audience) is: `//iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$WORKLOAD_POOL_ID/providers/$PROVIDER_ID`

Where the following variables need to be substituted:

* `$PROJECT_NUMBER`: The Google Cloud project number.
* `$WORKLOAD_POOL_ID`: The workload pool ID.
* `$PROVIDER_ID`: The provider ID.

The values for audience, service account impersonation URL, and any other builder field can also be found by generating a [credential configuration file with the gcloud CLI](https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/create-cred-config).

#### Using External Account Authorized User workforce credentials

[External account authorized user credentials](https://cloud.google.com/iam/docs/workforce-obtaining-short-lived-credentials#browser-based-sign-in) allow you to sign in with a web browser to an external identity provider account via the
gcloud CLI and create a configuration for the auth library to use.

To generate an external account authorized user workforce identity configuration, run the following command:

```bash
gcloud auth application-default login --login-config=$LOGIN_CONFIG
```

Where the following variable needs to be substituted:
- `$LOGIN_CONFIG`: The login config file generated with the cloud console or
   [gcloud iam workforce-pools create-login-config](https://cloud.google.com/sdk/gcloud/reference/iam/workforce-pools/create-login-config)

This will open a browser flow for you to sign in via the configured third party identity provider
and then will store the external account authorized user configuration at the well known ADC location.
The auth library will then use the provided refresh token from the configuration to generate and refresh
an access token to call Google Cloud services.

Note that the default lifetime of the refresh token is one hour, after which a new configuration will need to be generated from the gcloud CLI.
The lifetime can be modified by changing the [session duration of the workforce pool](https://cloud.google.com/iam/docs/reference/rest/v1/locations.workforcePools), and can be set as high as 12 hours.

#### Using Executable-sourced credentials with OIDC and SAML

**Executable-sourced credentials**
For executable-sourced credentials, a local executable is used to retrieve the 3rd party token.
The executable must handle providing a valid, unexpired OIDC ID token or SAML assertion in JSON format
to stdout.

To use executable-sourced credentials, the `GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES`
environment variable must be set to `1`.

To generate an executable-sourced workload identity configuration, run the following command:

```bash
# Generate a configuration file for executable-sourced credentials.
gcloud iam workload-identity-pools create-cred-config \
    projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID \
    --service-account=$SERVICE_ACCOUNT_EMAIL \
    --subject-token-type=$SUBJECT_TOKEN_TYPE \
    # The absolute path for the program, including arguments.
    # e.g. --executable-command="/path/to/command --foo=bar"
    --executable-command=$EXECUTABLE_COMMAND \
    # Optional argument for the executable timeout. Defaults to 30s.
    # --executable-timeout-millis=$EXECUTABLE_TIMEOUT \
    # Optional argument for the absolute path to the executable output file.
    # See below on how this argument impacts the library behaviour.
    # --executable-output-file=$EXECUTABLE_OUTPUT_FILE \
    --output-file /path/to/generated/config.json
```
Where the following variables need to be substituted:
- `$PROJECT_NUMBER`: The Google Cloud project number.
- `$POOL_ID`: The workload identity pool ID.
- `$PROVIDER_ID`: The OIDC or SAML provider ID.
- `$SERVICE_ACCOUNT_EMAIL`: The email of the service account to impersonate.
- `$SUBJECT_TOKEN_TYPE`: The subject token type.
- `$EXECUTABLE_COMMAND`: The full command to run, including arguments. Must be an absolute path to the program.

The `--executable-timeout-millis` flag is optional. This is the duration for which
the auth library will wait for the executable to finish, in milliseconds.
Defaults to 30 seconds when not provided. The maximum allowed value is 2 minutes.
The minimum is 5 seconds.

The `--executable-output-file` flag is optional. If provided, the file path must
point to the 3PI credential response generated by the executable. This is useful
for caching the credentials. By specifying this path, the Auth libraries will first
check for its existence before running the executable. By caching the executable JSON
response to this file, it improves performance as it avoids the need to run the executable
until the cached credentials in the output file are expired. The executable must
handle writing to this file - the auth libraries will only attempt to read from
this location. The format of contents in the file should match the JSON format
expected by the executable shown below.

To retrieve the 3rd party token, the library will call the executable
using the command specified. The executable's output must adhere to the response format
specified below. It must output the response to stdout.

A sample successful executable OIDC response:
```json
{
  "version": 1,
  "success": true,
  "token_type": "urn:ietf:params:oauth:token-type:id_token",
  "id_token": "HEADER.PAYLOAD.SIGNATURE",
  "expiration_time": 1620499962
}
```

A sample successful executable SAML response:
```json
{
  "version": 1,
  "success": true,
  "token_type": "urn:ietf:params:oauth:token-type:saml2",
  "saml_response": "...",
  "expiration_time": 1620499962
}
```
For successful responses, the `expiration_time` field is only required
when an output file is specified in the credential configuration.

A sample executable error response:
```json
{
  "version": 1,
  "success": false,
  "code": "401",
  "message": "Caller not authorized."
}
```
These are all required fields for an error response. The code and message
fields will be used by the library as part of the thrown exception.

Response format fields summary:
* `version`: The version of the JSON output. Currently, only version 1 is supported.
* `success`: The status of the response. When true, the response must contain the 3rd party token
     and token type. The response must also contain the expiration time if an output file was specified in the credential configuration.
     The executable must also exit with exit code 0.
     When false, the response must contain the error code and message fields and exit with a non-zero value.
* `token_type`: The 3rd party subject token type. Must be *urn:ietf:params:oauth:token-type:jwt*,
*urn:ietf:params:oauth:token-type:id_token*, or *urn:ietf:params:oauth:token-type:saml2*.
* `id_token`: The 3rd party OIDC token.
* `saml_response`: The 3rd party SAML response.
* `expiration_time`: The 3rd party subject token expiration time in seconds (unix epoch time).
* `code`: The error code string.
* `message`: The error message.

All response types must include both the `version` and `success` fields.
* Successful responses must include the `token_type` and one of
`id_token` or `saml_response`. The `expiration_time` field must also be present if an output file was specified in
the credential configuration.
* Error responses must include both the `code` and `message` fields.

The library will populate the following environment variables when the executable is run:
* `GOOGLE_EXTERNAL_ACCOUNT_AUDIENCE`: The audience field from the credential configuration. Always present.
* `GOOGLE_EXTERNAL_ACCOUNT_IMPERSONATED_EMAIL`: The service account email. Only present when service account impersonation is used.
* `GOOGLE_EXTERNAL_ACCOUNT_OUTPUT_FILE`: The output file location from the credential configuration. Only present when specified in the credential configuration.
* `GOOGLE_EXTERNAL_ACCOUNT_TOKEN_TYPE`: This expected subject token type. Always present.

These environment variables can be used by the executable to avoid hard-coding these values.

##### Security considerations
The following security practices are highly recommended:
* Access to the script should be restricted as it will be displaying credentials to stdout. This ensures that rogue processes do not gain  access to the script.
* The configuration file should not be modifiable. Write access should be restricted to avoid processes modifying the executable command portion.

Given the complexity of using executable-sourced credentials, it is recommended to use
the existing supported mechanisms (file-sourced/URL-sourced) for providing 3rd party
credentials unless they do not meet your specific requirements.

You can now [use the Auth library](#using-external-identities) to call Google Cloud
resources from an OIDC or SAML provider.

#### Configurable Token Lifetime
When creating a credential configuration with workload identity federation using service account impersonation, you can provide an optional argument to configure the service account access token lifetime.

To generate the configuration with configurable token lifetime, run the following command (this example uses an AWS configuration, but the token lifetime can be configured for all workload identity federation providers):

```bash
# Generate an AWS configuration file with configurable token lifetime.
gcloud iam workload-identity-pools create-cred-config \
    projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$AWS_PROVIDER_ID \
    --service-account $SERVICE_ACCOUNT_EMAIL \
    --aws \
    --output-file /path/to/generated/config.json \
    --service-account-token-lifetime-seconds $TOKEN_LIFETIME
```

 Where the following variables need to be substituted:
- `$PROJECT_NUMBER`: The Google Cloud project number.
- `$POOL_ID`: The workload identity pool ID.
- `$AWS_PROVIDER_ID`: The AWS provider ID.
- `$SERVICE_ACCOUNT_EMAIL`: The email of the service account to impersonate.
- `$TOKEN_LIFETIME`: The desired lifetime duration of the service account access token in seconds.

The `service-account-token-lifetime-seconds` flag is optional. If not provided, this defaults to one hour.
The minimum allowed value is 600 (10 minutes) and the maximum allowed value is 43200 (12 hours).
If a lifetime greater than one hour is required, the service account must be added as an allowed value in an Organization Policy that enforces the `constraints/iam.allowServiceAccountCredentialLifetimeExtension` constraint.

Note that configuring a short lifetime (e.g. 10 minutes) will result in the library initiating the entire token exchange flow every 10 minutes, which will call the 3rd party token provider even if the 3rd party token is not expired.

## Workforce Identity Federation

[Workforce identity federation](https://cloud.google.com/iam/docs/workforce-identity-federation) lets you use an
external identity provider (IdP) to authenticate and authorize a workforce—a group of users, such as employees,
partners, and contractors—using IAM, so that the users can access Google Cloud services. Workforce identity federation
extends Google Cloud's identity capabilities to support syncless, attribute-based single sign on.

With workforce identity federation, your workforce can access Google Cloud resources using an external
identity provider (IdP) that supports OpenID Connect (OIDC) or SAML 2.0 such as Azure Active Directory (Azure AD),
Active Directory Federation Services (AD FS), Okta, and others.

### Accessing resources using an OIDC or SAML 2.0 identity provider

In order to access Google Cloud resources from an identity provider that supports [OpenID Connect (OIDC)](https://openid.net/connect/),
the following requirements are needed:
- A workforce identity pool needs to be created.
- An OIDC or SAML 2.0 identity provider needs to be added in the workforce pool.

Follow the detailed [instructions](https://cloud.google.com/iam/docs/configuring-workforce-identity-federation) on how
to configure workforce identity federation.

After configuring an OIDC or SAML 2.0 provider, a credential configuration
file needs to be generated. The generated credential configuration file contains non-sensitive metadata to instruct the
library on how to retrieve external subject tokens and exchange them for GCP access tokens.
The configuration file can be generated by using the [gcloud CLI](https://cloud.google.com/sdk/).

The Auth library can retrieve external subject tokens from a local file location
(file-sourced credentials), from a local server (URL-sourced credentials) or by calling an executable
(executable-sourced credentials).

**File-sourced credentials**
For file-sourced credentials, a background process needs to be continuously refreshing the file
location with a new subject token prior to expiration. For tokens with one hour lifetimes, the token
needs to be updated in the file every hour. The token can be stored directly as plain text or in
JSON format.

To generate a file-sourced OIDC configuration, run the following command:

```bash
# Generate an OIDC configuration file for file-sourced credentials.
gcloud iam workforce-pools create-cred-config \
    locations/global/workforcePools/$WORKFORCE_POOL_ID/providers/$PROVIDER_ID \
    --subject-token-type=urn:ietf:params:oauth:token-type:id_token \
    --credential-source-file=$PATH_TO_OIDC_ID_TOKEN \
    --workforce-pool-user-project=$WORKFORCE_POOL_USER_PROJECT \
    # Optional arguments for file types. Default is "text":
    # --credential-source-type "json" \
    # Optional argument for the field that contains the OIDC credential.
    # This is required for json.
    # --credential-source-field-name "id_token" \
    --output-file=/path/to/generated/config.json
```
Where the following variables need to be substituted:
- `$WORKFORCE_POOL_ID`: The workforce pool ID.
- `$PROVIDER_ID`: The provider ID.
- `$PATH_TO_OIDC_ID_TOKEN`: The file path used to retrieve the OIDC token.
- `$WORKFORCE_POOL_USER_PROJECT`: The project number associated with the [workforce pools user project](https://cloud.google.com/iam/docs/workforce-identity-federation#workforce-pools-user-project).

To generate a file-sourced SAML configuration, run the following command:

```bash
# Generate a SAML configuration file for file-sourced credentials.
gcloud iam workforce-pools create-cred-config \
    locations/global/workforcePools/$WORKFORCE_POOL_ID/providers/$PROVIDER_ID \
    --credential-source-file=$PATH_TO_SAML_ASSERTION \
    --subject-token-type=urn:ietf:params:oauth:token-type:saml2 \
    --workforce-pool-user-project=$WORKFORCE_POOL_USER_PROJECT \
    --output-file=/path/to/generated/config.json
```

Where the following variables need to be substituted:
- `$WORKFORCE_POOL_ID`: The workforce pool ID.
- `$PROVIDER_ID`: The provider ID.
- `$PATH_TO_SAML_ASSERTION`: The file path used to retrieve the base64-encoded SAML assertion.
- `$WORKFORCE_POOL_USER_PROJECT`: The project number associated with the [workforce pools user project](https://cloud.google.com/iam/docs/workforce-identity-federation#workforce-pools-user-project).

These commands generate the configuration file in the specified output file.

**URL-sourced credentials**
For URL-sourced credentials, a local server needs to host a GET endpoint to return the OIDC token.
The response can be in plain text or JSON. Additional required request headers can also be
specified.

To generate a URL-sourced OIDC workforce identity configuration, run the following command:

```bash
# Generate an OIDC configuration file for URL-sourced credentials.
gcloud iam workforce-pools create-cred-config \
    locations/global/workforcePools/$WORKFORCE_POOL_ID/providers/$PROVIDER_ID \
    --subject-token-type=urn:ietf:params:oauth:token-type:id_token \
    --credential-source-url=$URL_TO_RETURN_OIDC_ID_TOKEN \
    --credential-source-headers $HEADER_KEY=$HEADER_VALUE \
    --workforce-pool-user-project=$WORKFORCE_POOL_USER_PROJECT \
    --output-file=/path/to/generated/config.json
```

Where the following variables need to be substituted:
- `$WORKFORCE_POOL_ID`: The workforce pool ID.
- `$PROVIDER_ID`: The provider ID.
- `$URL_TO_RETURN_OIDC_ID_TOKEN`: The URL of the local server endpoint.
- `$HEADER_KEY` and `$HEADER_VALUE`: The additional header key/value pairs to pass along the GET request to
   `$URL_TO_GET_OIDC_TOKEN`, e.g. `Metadata-Flavor=Google`.
- `$WORKFORCE_POOL_USER_PROJECT`: The project number associated with the [workforce pools user project](https://cloud.google.com/iam/docs/workforce-identity-federation#workforce-pools-user-project).

To generate a URL-sourced SAML configuration, run the following command:

```bash
# Generate a SAML configuration file for file-sourced credentials.
gcloud iam workforce-pools create-cred-config \
    locations/global/workforcePools/$WORKFORCE_POOL_ID/providers/$PROVIDER_ID \
    --subject-token-type=urn:ietf:params:oauth:token-type:saml2 \
    --credential-source-url=$URL_TO_GET_SAML_ASSERTION \
    --credential-source-headers $HEADER_KEY=$HEADER_VALUE \
    --workforce-pool-user-project=$WORKFORCE_POOL_USER_PROJECT \
    --output-file=/path/to/generated/config.json
```

These commands generate the configuration file in the specified output file.

Where the following variables need to be substituted:
- `$WORKFORCE_POOL_ID`: The workforce pool ID.
- `$PROVIDER_ID`: The provider ID.
- `$URL_TO_GET_SAML_ASSERTION`: The URL of the local server endpoint.
- `$HEADER_KEY` and `$HEADER_VALUE`: The additional header key/value pairs to pass along the GET request to
     `$URL_TO_GET_SAML_ASSERTION`, e.g. `Metadata-Flavor=Google`.
- `$WORKFORCE_POOL_USER_PROJECT`: The project number associated with the [workforce pools user project](https://cloud.google.com/iam/docs/workforce-identity-federation#workforce-pools-user-project).

### Using Executable-sourced workforce credentials with OIDC and SAML

**Executable-sourced credentials**
For executable-sourced credentials, a local executable is used to retrieve the 3rd party token.
The executable must handle providing a valid, unexpired OIDC ID token or SAML assertion in JSON format
to stdout.

To use executable-sourced credentials, the `GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES`
environment variable must be set to `1`.

To generate an executable-sourced workforce identity configuration, run the following command:

```bash
# Generate a configuration file for executable-sourced credentials.
gcloud iam workforce-pools create-cred-config \
    locations/global/workforcePools/$WORKFORCE_POOL_ID/providers/$PROVIDER_ID \
    --subject-token-type=$SUBJECT_TOKEN_TYPE \
    # The absolute path for the program, including arguments.
    # e.g. --executable-command="/path/to/command --foo=bar"
    --executable-command=$EXECUTABLE_COMMAND \
    # Optional argument for the executable timeout. Defaults to 30s.
    # --executable-timeout-millis=$EXECUTABLE_TIMEOUT \
    # Optional argument for the absolute path to the executable output file.
    # See below on how this argument impacts the library behaviour.
    # --executable-output-file=$EXECUTABLE_OUTPUT_FILE \
    --workforce-pool-user-project=$WORKFORCE_POOL_USER_PROJECT \
    --output-file /path/to/generated/config.json
```
Where the following variables need to be substituted:
- `$WORKFORCE_POOL_ID`: The workforce pool ID.
- `$PROVIDER_ID`: The provider ID.
- `$SUBJECT_TOKEN_TYPE`: The subject token type.
- `$EXECUTABLE_COMMAND`: The full command to run, including arguments. Must be an absolute path to the program.
- `$WORKFORCE_POOL_USER_PROJECT`: The project number associated with the [workforce pools user project](https://cloud.google.com/iam/docs/workforce-identity-federation#workforce-pools-user-project).

The `--executable-timeout-millis` flag is optional. This is the duration for which
the auth library will wait for the executable to finish, in milliseconds.
Defaults to 30 seconds when not provided. The maximum allowed value is 2 minutes.
The minimum is 5 seconds.

The `--executable-output-file` flag is optional. If provided, the file path must
point to the 3rd party credential response generated by the executable. This is useful
for caching the credentials. By specifying this path, the Auth libraries will first
check for its existence before running the executable. By caching the executable JSON
response to this file, it improves performance as it avoids the need to run the executable
until the cached credentials in the output file are expired. The executable must
handle writing to this file - the auth libraries will only attempt to read from
this location. The format of contents in the file should match the JSON format
expected by the executable shown below.

To retrieve the 3rd party token, the library will call the executable
using the command specified. The executable's output must adhere to the response format
specified below. It must output the response to stdout.

Refer to the [using executable-sourced credentials with Workload Identity Federation](#using-executable-sourced-credentials-with-oidc-and-saml)
above for the executable response specification.

##### Security considerations
The following security practices are highly recommended:
* Access to the script should be restricted as it will be displaying credentials to stdout. This ensures that rogue processes do not gain access to the script.
* The configuration file should not be modifiable. Write access should be restricted to avoid processes modifying the executable command portion.

Given the complexity of using executable-sourced credentials, it is recommended to use
the existing supported mechanisms (file-sourced/URL-sourced) for providing 3rd party
credentials unless they do not meet your specific requirements.

You can now [use the Auth library](#using-external-identities) to call Google Cloud
resources from an OIDC or SAML provider.

### Accessing resources from an OIDC or SAML2.0 identity provider using a custom supplier

If you want to use OIDC or SAML2.0 that cannot be retrieved using methods supported natively by this library,
a custom SubjectTokenSupplier implementation may be specified when creating an identity pool client. The supplier must
return a valid, unexpired subject token when called by the GCP credential.

Note that the client does not cache the returned subject token, so caching logic should be implemented in the supplier to prevent multiple requests for the same resources.

```ts
class CustomSupplier implements SubjectTokenSupplier {
  async getSubjectToken(
    context: ExternalAccountSupplierContext
  ): Promise<string> {
    const audience = context.audience;
    const subjectTokenType = context.subjectTokenType;
    // Return a valid subject token for the requested audience and subject token type.
  }
}

const clientOptions = {
  audience: '//iam.googleapis.com/locations/global/workforcePools/$WORKFORCE_POOL_ID/providers/$PROVIDER_ID', // Set the GCP audience.
  subject_token_type: 'urn:ietf:params:oauth:token-type:id_token', // Set the subject token type.
  subject_token_supplier: new CustomSupplier() // Set the custom supplier.
}

const client = new CustomSupplier(clientOptions);
```

Where the audience is: `//iam.googleapis.com/locations/global/workforcePools/$WORKFORCE_POOL_ID/providers/$PROVIDER_ID`

Where the following variables need to be substituted:

* `$WORKFORCE_POOL_ID`: The worforce pool ID.
* `$PROVIDER_ID`: The provider ID.

and the workforce pool user project is the project number associated with the [workforce pools user project](https://cloud.google.com/iam/docs/workforce-identity-federation#workforce-pools-user-project).

The values for audience, service account impersonation URL, and any other builder field can also be found by generating a [credential configuration file with the gcloud CLI](https://cloud.google.com/iam/docs/workforce-obtaining-short-lived-credentials#use_configuration_files_for_sign-in).

### Using External Identities

External identities (AWS, Azure and OIDC-based providers) can be used with `Application Default Credentials`.
In order to use external identities with Application Default Credentials, you need to generate the JSON credentials configuration file for your external identity as described above.
Once generated, store the path to this file in the `GOOGLE_APPLICATION_CREDENTIALS` environment variable.

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/config.json
```

The library can now automatically choose the right type of client and initialize credentials from the context provided in the configuration file.

```js
async function main() {
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
  });
  const client = await auth.getClient();
  const projectId = await auth.getProjectId();
  // List all buckets in a project.
  const url = `https://storage.googleapis.com/storage/v1/b?project=${projectId}`;
  const res = await client.request({ url });
  console.log(res.data);
}
```

When using external identities with Application Default Credentials in Node.js, the `roles/browser` role needs to be granted to the service account.
The `Cloud Resource Manager API` should also be enabled on the project.
This is needed since the library will try to auto-discover the project ID from the current environment using the impersonated credential.
To avoid this requirement, the project ID can be explicitly specified on initialization.

```js
const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/cloud-platform',
  // Pass the project ID explicitly to avoid the need to grant `roles/browser` to the service account
  // or enable Cloud Resource Manager API on the project.
  projectId: 'CLOUD_RESOURCE_PROJECT_ID',
});
```

You can also explicitly initialize external account clients using the generated configuration file.

```js
const {ExternalAccountClient} = require('google-auth-library');
const jsonConfig = require('/path/to/config.json');

async function main() {
  const client = ExternalAccountClient.fromJSON(jsonConfig);
  client.scopes = ['https://www.googleapis.com/auth/cloud-platform'];
  // List all buckets in a project.
  const url = `https://storage.googleapis.com/storage/v1/b?project=${projectId}`;
  const res = await client.request({url});
  console.log(res.data);
}
```

#### Security Considerations
Note that this library does not perform any validation on the token_url, token_info_url, or service_account_impersonation_url fields of the credential configuration. It is not recommended to use a credential configuration that you did not generate with the gcloud CLI unless you verify that the URL fields point to a googleapis.com domain.

## Working with ID Tokens
### Fetching ID Tokens
If your application is running on Cloud Run or Cloud Functions, or using Cloud Identity-Aware
Proxy (IAP), you will need to fetch an ID token to access your application. For
this, use the method `getIdTokenClient` on the `GoogleAuth` client.

For invoking Cloud Run services, your service account will need the
[`Cloud Run Invoker`](https://cloud.google.com/run/docs/authenticating/service-to-service)
IAM permission.

For invoking Cloud Functions, your service account will need the
[`Function Invoker`](https://cloud.google.com/functions/docs/securing/authenticating#function-to-function)
IAM permission.

``` js
// Make a request to a protected Cloud Run service.
const {GoogleAuth} = require('google-auth-library');

async function main() {
  const url = 'https://cloud-run-1234-uc.a.run.app';
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient(url);
  const res = await client.request({url});
  console.log(res.data);
}

main().catch(console.error);
```

A complete example can be found in [`samples/idtokens-serverless.js`](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/idtokens-serverless.js).

For invoking Cloud Identity-Aware Proxy, you will need to pass the Client ID
used when you set up your protected resource as the target audience.

``` js
// Make a request to a protected Cloud Identity-Aware Proxy (IAP) resource
const {GoogleAuth} = require('google-auth-library');

async function main()
  const targetAudience = 'iap-client-id';
  const url = 'https://iap-url.com';
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient(targetAudience);
  const res = await client.request({url});
  console.log(res.data);
}

main().catch(console.error);
```

A complete example can be found in [`samples/idtokens-iap.js`](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/idtokens-iap.js).

### Verifying ID Tokens

If you've [secured your IAP app with signed headers](https://cloud.google.com/iap/docs/signed-headers-howto),
you can use this library to verify the IAP header:

```js
const {OAuth2Client} = require('google-auth-library');
// Expected audience for App Engine.
const expectedAudience = `/projects/your-project-number/apps/your-project-id`;
// IAP issuer
const issuers = ['https://cloud.google.com/iap'];
// Verify the token. OAuth2Client throws an Error if verification fails
const oAuth2Client = new OAuth2Client();
const response = await oAuth2Client.getIapCerts();
const ticket = await oAuth2Client.verifySignedJwtWithCertsAsync(
  idToken,
  response.pubkeys,
  expectedAudience,
  issuers
);

// Print out the info contained in the IAP ID token
console.log(ticket)
```

A complete example can be found in [`samples/verifyIdToken-iap.js`](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/verifyIdToken-iap.js).

## Impersonated Credentials Client

Google Cloud Impersonated credentials used for [Creating short-lived service account credentials](https://cloud.google.com/iam/docs/creating-short-lived-service-account-credentials).

Provides authentication for applications where local credentials impersonates a remote service account using [IAM Credentials API](https://cloud.google.com/iam/docs/reference/credentials/rest).

An Impersonated Credentials Client is instantiated with a `sourceClient`. This
client should use credentials that have the "Service Account Token Creator" role (`roles/iam.serviceAccountTokenCreator`),
and should authenticate with the `https://www.googleapis.com/auth/cloud-platform`, or `https://www.googleapis.com/auth/iam` scopes.

`sourceClient` is used by the Impersonated
Credentials Client to impersonate a target service account with a specified
set of scopes.

### Sample Usage

```javascript
const { GoogleAuth, Impersonated } = require('google-auth-library');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

async function main() {

  // Acquire source credentials:
  const auth = new GoogleAuth();
  const client = await auth.getClient();

  // Impersonate new credentials:
  let targetClient = new Impersonated({
    sourceClient: client,
    targetPrincipal: 'impersonated-account@projectID.iam.gserviceaccount.com',
    lifetime: 30,
    delegates: [],
    targetScopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  // Get impersonated credentials:
  const authHeaders = await targetClient.getRequestHeaders();
  // Do something with `authHeaders.Authorization`.

  // Use impersonated credentials:
  const url = 'https://www.googleapis.com/storage/v1/b?project=anotherProjectID'
  const resp = await targetClient.request({ url });
  for (const bucket of resp.data.items) {
    console.log(bucket.name);
  }

  // Use impersonated credentials with google-cloud client library
  // Note: this works only with certain cloud client libraries utilizing gRPC
  //    e.g., SecretManager, KMS, AIPlatform
  // will not currently work with libraries using REST, e.g., Storage, Compute
  const smClient = new SecretManagerServiceClient({
    projectId: anotherProjectID,
    auth: {
      getClient: () => targetClient,
    },
  });
  const secretName = 'projects/anotherProjectNumber/secrets/someProjectName/versions/1';
  const [accessResponse] = await smClient.accessSecretVersion({
    name: secretName,
  });

  const responsePayload = accessResponse.payload.data.toString('utf8');
  // Do something with the secret contained in `responsePayload`.
};

main();
```

## Downscoped Client

[Downscoping with Credential Access Boundaries](https://cloud.google.com/iam/docs/downscoping-short-lived-credentials) is used to restrict the Identity and Access Management (IAM) permissions that a short-lived credential can use.

The `DownscopedClient` class can be used to produce a downscoped access token from a
`CredentialAccessBoundary` and a source credential. The Credential Access Boundary specifies which resources the newly created credential can access, as well as an upper bound on the permissions that are available on each resource. Using downscoped credentials ensures tokens in flight always have the least privileges, e.g. Principle of Least Privilege.

> Notice: Only Cloud Storage supports Credential Access Boundaries for now.

### Sample Usage
There are two entities needed to generate and use credentials generated from
Downscoped Client with Credential Access Boundaries.

- Token broker: This is the entity with elevated permissions. This entity has the permissions needed to generate downscoped tokens. The common pattern of usage is to have a token broker with elevated access generate these downscoped credentials from higher access source credentials and pass the downscoped short-lived access tokens to a token consumer via some secure authenticated channel for limited access to Google Cloud Storage resources.

``` js
const {GoogleAuth, DownscopedClient} = require('google-auth-library');
// Define CAB rules which will restrict the downscoped token to have readonly
// access to objects starting with "customer-a" in bucket "bucket_name".
const cabRules = {
  accessBoundary: {
    accessBoundaryRules: [
      {
        availableResource: `//storage.googleapis.com/projects/_/buckets/bucket_name`,
        availablePermissions: ['inRole:roles/storage.objectViewer'],
        availabilityCondition: {
          expression:
            `resource.name.startsWith('projects/_/buckets/` +
            `bucket_name/objects/customer-a)`
        }
      },
    ],
  },
};

// This will use ADC to get the credentials used for the downscoped client.
const googleAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

// Obtain an authenticated client via ADC.
const client = await googleAuth.getClient();

// Use the client to create a DownscopedClient.
const cabClient = new DownscopedClient(client, cab);

// Refresh the tokens.
const refreshedAccessToken = await cabClient.getAccessToken();

// This will need to be passed to the token consumer.
access_token = refreshedAccessToken.token;
expiry_date = refreshedAccessToken.expirationTime;
```

A token broker can be set up on a server in a private network. Various workloads
(token consumers) in the same network will send authenticated requests to that broker for downscoped tokens to access or modify specific google cloud storage buckets.

The broker will instantiate downscoped credentials instances that can be used to generate short lived downscoped access tokens which will be passed to the token consumer.

- Token consumer: This is the consumer of the downscoped tokens. This entity does not have the direct ability to generate access tokens and instead relies on the token broker to provide it with downscoped tokens to run operations on GCS buckets. It is assumed that the downscoped token consumer may have its own mechanism to authenticate itself with the token broker.

``` js
const {OAuth2Client} = require('google-auth-library');
const {Storage} = require('@google-cloud/storage');

// Create the OAuth credentials (the consumer).
const oauth2Client = new OAuth2Client();
// We are defining a refresh handler instead of a one-time access
// token/expiry pair.
// This will allow the consumer to obtain new downscoped tokens on
// demand every time a token is expired, without any additional code
// changes.
oauth2Client.refreshHandler = async () => {
  // The common pattern of usage is to have a token broker pass the
  // downscoped short-lived access tokens to a token consumer via some
  // secure authenticated channel.
  const refreshedAccessToken = await cabClient.getAccessToken();
  return {
    access_token: refreshedAccessToken.token,
    expiry_date: refreshedAccessToken.expirationTime,
  }
};

// Use the consumer client to define storageOptions and create a GCS object.
const storageOptions = {
  projectId: 'my_project_id',
  authClient: oauth2Client,
};

const storage = new Storage(storageOptions);

const downloadFile = await storage
    .bucket('bucket_name')
    .file('customer-a-data.txt')
    .download();
console.log(downloadFile.toString('utf8'));

main().catch(console.error);
```


## Samples

Samples are in the [`samples/`](https://github.com/googleapis/google-auth-library-nodejs/tree/main/samples) directory. Each sample's `README.md` has instructions for running its sample.

| Sample                      | Source Code                       | Try it |
| --------------------------- | --------------------------------- | ------ |
| Adc | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/adc.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/adc.js,samples/README.md) |
| Authenticate API Key | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/authenticateAPIKey.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/authenticateAPIKey.js,samples/README.md) |
| Authenticate Explicit | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/authenticateExplicit.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/authenticateExplicit.js,samples/README.md) |
| Authenticate Implicit With Adc | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/authenticateImplicitWithAdc.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/authenticateImplicitWithAdc.js,samples/README.md) |
| Compute | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/compute.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/compute.js,samples/README.md) |
| Credentials | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/credentials.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/credentials.js,samples/README.md) |
| Downscopedclient | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/downscopedclient.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/downscopedclient.js,samples/README.md) |
| Headers | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/headers.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/headers.js,samples/README.md) |
| Id Token From Impersonated Credentials | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/idTokenFromImpersonatedCredentials.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/idTokenFromImpersonatedCredentials.js,samples/README.md) |
| Id Token From Metadata Server | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/idTokenFromMetadataServer.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/idTokenFromMetadataServer.js,samples/README.md) |
| Id Token From Service Account | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/idTokenFromServiceAccount.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/idTokenFromServiceAccount.js,samples/README.md) |
| ID Tokens for Identity-Aware Proxy (IAP) | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/idtokens-iap.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/idtokens-iap.js,samples/README.md) |
| ID Tokens for Serverless | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/idtokens-serverless.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/idtokens-serverless.js,samples/README.md) |
| Jwt | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/jwt.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/jwt.js,samples/README.md) |
| Keepalive | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/keepalive.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/keepalive.js,samples/README.md) |
| Keyfile | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/keyfile.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/keyfile.js,samples/README.md) |
| Oauth2-code Verifier | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/oauth2-codeVerifier.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/oauth2-codeVerifier.js,samples/README.md) |
| Oauth2 | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/oauth2.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/oauth2.js,samples/README.md) |
| Sign Blob | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/signBlob.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/signBlob.js,samples/README.md) |
| Sign Blob Impersonated | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/signBlobImpersonated.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/signBlobImpersonated.js,samples/README.md) |
| Verify Google Id Token | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/verifyGoogleIdToken.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/verifyGoogleIdToken.js,samples/README.md) |
| Verifying ID Tokens from Identity-Aware Proxy (IAP) | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/verifyIdToken-iap.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/verifyIdToken-iap.js,samples/README.md) |
| Verify Id Token | [source code](https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/verifyIdToken.js) | [![Open in Cloud Shell][shell_img]](https://console.cloud.google.com/cloudshell/open?git_repo=https://github.com/googleapis/google-auth-library-nodejs&page=editor&open_in_editor=samples/verifyIdToken.js,samples/README.md) |



The [Google Auth Library Node.js Client API Reference][client-docs] documentation
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
For example, `npm install google-auth-library@legacy-8` installs client libraries
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

Contributions welcome! See the [Contributing Guide](https://github.com/googleapis/google-auth-library-nodejs/blob/main/CONTRIBUTING.md).

Please note that this `README.md`, the `samples/README.md`,
and a variety of configuration files in this repository (including `.nycrc` and `tsconfig.json`)
are generated from a central template. To edit one of these files, make an edit
to its templates in
[directory](https://github.com/googleapis/synthtool).

## License

Apache Version 2.0

See [LICENSE](https://github.com/googleapis/google-auth-library-nodejs/blob/main/LICENSE)

[client-docs]: https://cloud.google.com/nodejs/docs/reference/google-auth-library/latest
[product-docs]: https://cloud.google.com/docs/authentication/
[shell_img]: https://gstatic.com/cloudssh/images/open-btn.png
[projects]: https://console.cloud.google.com/project
[billing]: https://support.google.com/cloud/answer/6293499#enable-billing

[auth]: https://cloud.google.com/docs/authentication/external/set-up-adc-local
