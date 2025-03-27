import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { boletoService } from './services/boletoService';
import { cartaoService } from './services/cartaoService';
import { carneService } from './services/carneService';
import { assinaturaService } from './services/assinaturaService';
import { linkService } from './services/linkService';
import { splitService } from './services/splitService';
import { notificacaoService} from './services/notificacaoService';
import { auth } from './endpoints/Auth/auth';

export async function execute(
  this: IExecuteFunctions,
  endpoint: string,
  i: number
) {
  const returnData: any[] = [];
  const credentials = await this.getCredentials('EfiBankCobApi');
  const isProd = credentials.environment === 'prod';
	const clientId = isProd ? credentials.clientIdProd : credentials.clientIdHomolog;
	const clientSecret = isProd ? credentials.clientSecretProd : credentials.clientSecretHomolog;
	const baseURL = credentials.environment === 'homolog'
		? 'https://cobrancas-h.api.efipay.com.br' // Homologação
		: 'https://cobrancas.api.efipay.com.br';  // Produção

  const accessToken = await auth({ clientId: String(clientId), clientSecret: String(clientSecret) }, baseURL, this.helpers.httpRequest);

	const transactionType = this.getNodeParameter('transactionType', i) as string;

  try {
    let requestOptions: IHttpRequestOptions;

		switch (transactionType) {
      case 'boleto':
        requestOptions = await boletoService.call(this, endpoint, i, baseURL, accessToken);
        break;
			case 'cartao':
					requestOptions = await cartaoService.call(this, endpoint, i, baseURL, accessToken);
					break;
      case 'carne':
        requestOptions = await carneService.call(this, endpoint, i, baseURL, accessToken);
        break;
			case 'assinatura':
				requestOptions = await assinaturaService.call(this, endpoint, i, baseURL, accessToken);
				break;
			case 'link':
				requestOptions = await linkService.call(this, endpoint, i, baseURL, accessToken);
				break;
			case 'split':
				requestOptions = await splitService.call(this, endpoint, i, baseURL, accessToken);
				break;
			case 'notificacao':
				requestOptions = await notificacaoService.call(this, endpoint, i, baseURL, accessToken);
				break;
      default:
      throw new Error(`Erro: '${transactionType}' não é um tipo de transação válida.`);
    }

		const response = await this.helpers.httpRequest(requestOptions);

    returnData.push({ json: response });
  } catch (error) {
    this.logger.error('Erro ao executar a requisição:', error);

    if (error.isAxiosError) {
      if (error.response) {
        const responseData = error.response.data;
        let errorMessage = 'Erro na API';
        let errorDetails = {};

        if (typeof responseData === 'object') {
          errorMessage = responseData.message ||
                         responseData.error_description ||
                         responseData.error ||
                         `Error ${error.response.status}: ${error.response.statusText}`;
          errorDetails = responseData;
        } else if (typeof responseData === 'string') {
          errorMessage = responseData;
          try {
            errorDetails = JSON.parse(responseData);
          } catch (e) {
            errorDetails = { rawResponse: responseData };
          }
        }

        this.logger.error('Erro detalhado da API:', {
          statusCode: error.response.status,
          message: errorMessage,
          details: JSON.stringify(errorDetails, null, 2)
        });

        returnData.push({
          json: {
            success: false,
            status: error.response.status,
            statusText: error.response.statusText,
            message: errorMessage,
            details: errorDetails
          },
        });
      } else if (error.request) {
        this.logger.error('Sem resposta da API:', { message: error.message });
        returnData.push({
          json: {
            success: false,
            message: 'Sem resposta da API',
            error: error.message
          }
        });
      } else {
        this.logger.error('Erro na configuração da requisição:', { message: error.message });
        returnData.push({
          json: {
            success: false,
            message: 'Erro na configuração da requisição',
            error: error.message
          }
        });
      }
    } else {
      this.logger.error('Erro desconhecido:', { message: error.message });
      returnData.push({
        json: {
          success: false,
          message: 'Erro desconhecido',
          error: error.message
        }
      });
    }

    if (this.continueOnFail()) {
      return returnData;
    } else {
      if (error.isAxiosError && error.response && error.response.data) {
        const apiError = new Error(`API Error: ${JSON.stringify(error.response.data)}`);
        throw apiError;
      }
      throw error;
    }
  }

  return returnData;

}
