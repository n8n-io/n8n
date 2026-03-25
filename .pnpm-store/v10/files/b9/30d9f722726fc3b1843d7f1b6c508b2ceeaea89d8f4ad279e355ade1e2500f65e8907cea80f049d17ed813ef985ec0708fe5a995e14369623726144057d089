import { getServiceTokenData } from '../api';
import { decryptSymmetric128BitHexKeyUTF8 } from '../utils/crypto';
import { 
    ServiceTokenClientConfig, 
    WorkspaceConfig
} from '../types/InfisicalClient';

export const populateClientWorkspaceConfigsHelper = async (clientConfig: ServiceTokenClientConfig): Promise<WorkspaceConfig> => {
    const serviceTokenData = await getServiceTokenData({
        apiRequest: clientConfig.apiRequest
    });

    const workspaceKey = decryptSymmetric128BitHexKeyUTF8({
        ciphertext: serviceTokenData.encryptedKey,
        iv: serviceTokenData.iv,
        tag: serviceTokenData.tag,
        key: clientConfig.credentials.serviceTokenKey
    });
    
    return ({
        workspaceId: serviceTokenData.workspace,
        workspaceKey
    });
}