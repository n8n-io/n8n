import { createHmac } from 'crypto';
import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';
export async function verifySignature() {
    const authentication = this.getNodeParameter('authentication', 'apiKey');
    // OAuth2 flows do not expose an API key that can be used as the shared secret,
    // so verification is skipped to remain backward compatible.
    if (authentication !== 'apiKey') {
        return true;
    }
    const req = this.getRequestObject();
    let apiKey;
    try {
        const credentials = await this.getCredentials('acuitySchedulingApi');
        apiKey = typeof credentials?.apiKey === 'string' ? credentials.apiKey : undefined;
    }
    catch {
        return true;
    }
    return verifySignatureGeneric({
        getExpectedSignature: () => {
            if (!apiKey || !req.rawBody) {
                return null;
            }
            const hmac = createHmac('sha256', apiKey);
            const payload = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
            hmac.update(payload);
            return hmac.digest('base64');
        },
        skipIfNoExpectedSignature: !apiKey,
        getActualSignature: () => {
            const signature = req.header('x-acuity-signature');
            return typeof signature === 'string' ? signature : null;
        },
    });
}
//# sourceMappingURL=AcuitySchedulingTriggerHelpers.js.map