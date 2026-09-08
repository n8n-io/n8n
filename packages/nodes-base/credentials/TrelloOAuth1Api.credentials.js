export class TrelloOAuth1Api {
    name = 'trelloOAuth1Api';
    extends = ['oAuth1Api'];
    displayName = 'Trello OAuth1 API';
    documentationUrl = 'trello';
    properties = [
        {
            displayName: 'Request Token URL',
            name: 'requestTokenUrl',
            type: 'hidden',
            default: 'https://trello.com/1/OAuthGetRequestToken',
        },
        {
            displayName: 'Authorization URL',
            name: 'authUrl',
            type: 'hidden',
            default: 'https://trello.com/1/OAuthAuthorizeToken?scope=read,write,account&expiration=never&name=n8n',
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: 'https://trello.com/1/OAuthGetAccessToken',
        },
        {
            displayName: 'Signature Method',
            name: 'signatureMethod',
            type: 'hidden',
            default: 'HMAC-SHA1',
        },
    ];
}
//# sourceMappingURL=TrelloOAuth1Api.credentials.js.map