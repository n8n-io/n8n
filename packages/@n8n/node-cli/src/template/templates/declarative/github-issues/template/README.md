# {{nodePackageName}}

This is an n8n community node. It lets you use GitHub Issues in your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

- Issues
    - Get an issue
    - Get many issues in a repository
    - Create a new issue
- Issue Comments
    - Get many issue comments

## Credentials

You can use either access token or OAuth2 to use this node.

### Access token

1. Open your GitHub profile [Settings](https://github.com/settings/profile).
2. In the left navigation, select [Developer settings](https://github.com/settings/apps).
3. In the left navigation, under Personal access tokens, select Tokens (classic).
4. Select Generate new token > Generate new token (classic).
5. Enter a descriptive name for your token in the Note field, like n8n integration.
6. Select the Expiration you'd like for the token, or select No expiration.
7. Select Scopes for your token. For most of the n8n GitHub nodes, add the `repo` scope.
    - A token without assigned scopes can only access public information.
8. Select Generate token.
9. Copy the token.

Refer to [Creating a personal access token (classic)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic) for more information. Refer to Scopes for OAuth apps for more information on GitHub scopes.

![Generated Access token in GitHub](https://docs.github.com/assets/cb-17251/mw-1440/images/help/settings/personal-access-tokens.webp)

### OAuth2

If you're self-hosting n8n, create a new GitHub [OAuth app](https://docs.github.com/en/apps/oauth-apps):

1. Open your GitHub profile [Settings](https://github.com/settings/profile).
2. In the left navigation, select [Developer settings](https://github.com/settings/apps).
3. In the left navigation, select OAuth apps.
4. Select New OAuth App.
    - If you haven't created an app before, you may see Register a new application instead. Select it.
5. Enter an Application name, like n8n integration.
6. Enter the Homepage URL for your app's website.
7. If you'd like, add the optional Application description, which GitHub displays to end-users.
8. From n8n, copy the OAuth Redirect URL and paste it into the GitHub Authorization callback URL.
9. Select Register application.
10. Copy the Client ID and Client Secret this generates and add them to your n8n credential.

Refer to the [GitHub Authorizing OAuth apps documentation](https://docs.github.com/en/apps/oauth-apps/using-oauth-apps/authorizing-oauth-apps) for more information on the authorization process.

## Compatibility

Compatible with n8n@1.60.0 or later

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [GitHub API docs](https://docs.github.com/en/rest/issues)
