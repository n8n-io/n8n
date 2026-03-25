import { WebsocketSignatureV4 } from "./WebsocketSignatureV4";
export const resolveWebSocketConfig = (input) => {
    const { signer } = input;
    return Object.assign(input, {
        signer: async (authScheme) => {
            const signerObj = await signer(authScheme);
            if (validateSigner(signerObj)) {
                return new WebsocketSignatureV4({ signer: signerObj });
            }
            throw new Error("Expected WebsocketSignatureV4 signer, please check the client constructor.");
        },
    });
};
const validateSigner = (signer) => !!signer;
