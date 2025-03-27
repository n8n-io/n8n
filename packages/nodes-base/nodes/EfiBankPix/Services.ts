import { IExecuteFunctions } from 'n8n-workflow';
import { cobService } from './services/cobService';
import { cobvService } from './services/cobvService';
import { paymentService } from './services/paymentService';
import { managementService } from './services/managementService';
import { locationService } from './services/locationService';
import { batchService } from './services/batchService';
import { splitService } from './services/splitService';
import { webhooksService } from './services/webhooksService';
import { exclusivesService } from './services/exclusivesService';

export async function execute(
  this: IExecuteFunctions,
  endpoint: string,
  i: number
) {
  const returnData: any[] = [];
  const transactionType = this.getNodeParameter('transactionType', i) as string;
  try {
    let response;
    switch (transactionType) {
      
      case 'cob':
        response = await cobService.call(this, endpoint, i);
        break;
      case 'cobv':
        response = await cobvService.call(this, endpoint, i);
        break;
      case 'payment':
        response = await paymentService.call(this, endpoint, i);
        break;
      case 'management':
        response = await managementService.call(this, endpoint, i);
        break;
      case 'location':
        response = await locationService.call(this, endpoint, i);
        break;
      case 'batch':
        response = await batchService.call(this, endpoint, i);
        break;
      case 'split':
        response = await splitService.call(this, endpoint, i);
        break;
      case 'webhooks':
        response = await webhooksService.call(this, endpoint, i);
        break;
      case 'exclusives':
        response = await exclusivesService.call(this, endpoint, i);
        break;

      default:
        throw new Error(`Erro: '${transactionType}' não é um tipo de transação válida.`);
    }

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
      } else {
        this.logger.error('Erro na requisição:', error.message);
        returnData.push({ json: { error: error.message } });
      }
    } else {
      this.logger.error('Erro desconhecido:', error.message);
      returnData.push({ json: { error: error.message } });
    }

    if (this.continueOnFail()) {
      return returnData;
    } else {
      throw error;
    }
  }

  return returnData;
}