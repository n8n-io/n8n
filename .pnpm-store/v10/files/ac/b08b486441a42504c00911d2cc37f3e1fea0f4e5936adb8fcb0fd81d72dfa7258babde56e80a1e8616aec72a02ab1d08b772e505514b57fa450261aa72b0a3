export default class OpenidConfigurationGetterGetter {
    constructor(client) {
        this.do = () => {
            return this.client
                .getRaw('/.well-known/openid-configuration')
                .then((res) => {
                if (res.status < 400) {
                    return res.json();
                }
                if (res.status == 404) {
                    // OIDC is not configured
                    return Promise.resolve(undefined);
                }
                return Promise.reject(new Error(`unexpected status code: ${res.status}`));
            });
        };
        this.client = client;
    }
}
