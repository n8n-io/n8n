import { AxiosInstance } from 'axios';
import { IServiceTokenData } from '../../types/models';

export const getServiceTokenData = async ({
    apiRequest 
}: {
    apiRequest: AxiosInstance;
}): Promise<IServiceTokenData> => {
    const { data } = await apiRequest.get<IServiceTokenData>('/api/v2/service-token');
    return data;
}