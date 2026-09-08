export class OrbitApi {
    name = 'orbitApi';
    displayName = 'Orbit API';
    documentationUrl = 'orbit';
    properties = [
        {
            displayName: 'Orbit has been shutdown and will no longer function from July 11th, You can read more <a target="_blank" href="https://orbit.love/blog/orbit-is-joining-postman">here</a>.',
            name: 'deprecated',
            type: 'notice',
            default: '',
        },
        {
            displayName: 'API Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=OrbitApi.credentials.js.map