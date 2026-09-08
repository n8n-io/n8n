async function validateCredentials(decryptedCredentials) {
    const credentials = decryptedCredentials;
    const { subdomain, apiKey } = credentials;
    const options = {
        method: 'GET',
        auth: {
            username: apiKey,
            password: 'x',
        },
        url: `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/employees/directory`,
    };
    return await this.helpers.request(options);
}
export async function bambooHrApiCredentialTest(credential) {
    try {
        await validateCredentials.call(this, credential.data);
    }
    catch (error) {
        return {
            status: 'Error',
            message: 'The API Key included in the request is invalid',
        };
    }
    return {
        status: 'OK',
        message: 'Connection successful!',
    };
}
//# sourceMappingURL=credentialTest.js.map