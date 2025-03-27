import { INodeProperties } from 'n8n-workflow';
import { cobConfig } from './properties/cobConfig';
import { cobvConfig} from './properties/cobvConfig';
import { paymentConfig } from './properties/paymentConfig';
import { managementConfig } from './properties/managementConfig';
import { locationConfig } from './properties/locationConfig';
import { batchConfig } from './properties/batchConfig';
import { splitConfig } from './properties/splitConfig';
import { webhooksConfig } from './properties/webhooksConfig';
import { exclusivesConfig } from './properties/exclusivesConfig';

export const propertiesConfig: INodeProperties[] = [
  {
    displayName: 'Tipo de transação',
    name: 'transactionType',
    type: 'options',
    noDataExpression: true,
    options: [
      { name: 'Cobranças imediatas', value: 'cob' },
      { name: 'Cobranças com vencimento', value: 'cobv' },
      { name: 'Envio e Pagamento Pix', value: 'payment' },
      { name: 'Gestão de Pix', value: 'management' },
      { name: 'Payload Locations', value: 'location' },
      { name: 'Cobranças em Lote', value: 'batch' },
      { name: 'Split de pagamento Pix', value: 'split' },
      { name: 'Webhooks', value: 'webhooks' },
      { name: 'Endpoints exclusivos EfÍ', value: 'exclusives' },
    ],
    default: 'cob',
    description: 'Selecione o tipo da transação',
  },

  {
    displayName: 'Endpoints para Cobranças Imediatas',
    name: 'endpoints',
    type: 'options',
   
    options: [
      { name: 'Criar cobrança imediata (sem txid)', value: 'pixCreateImmediateCharge' },
      { name: 'Criar cobrança imediata (com txid)', value: 'pixCreateCharge' },
      { name: 'Revisar cobrança', value: 'pixUpdateCharge' },
      { name: 'Consultar cobrança', value: 'pixDetailCharge' },
      { name: 'Consultar lista de cobranças', value: 'pixListCharges' },
    ],
    default: 'pixCreateImmediateCharge',
    description: 'Selecione o endpoint que você deseja utilizar',
    displayOptions: {
      show: { transactionType: ['cob'] },
    },
  },

  {
    displayName: 'Endpoints para Cobranças com vencimento',
    name: 'endpoints',
    type: 'options',
   
    options: [
      { name: 'Criar cobrança com vencimento', value: 'pixCreateDueCharge' },
      { name: 'Revisar cobrança com vencimento', value: 'pixUpdateDueCharge' },
      { name: 'Consultar cobrança com vencimento', value: 'pixDetailDueCharge' },
      { name: 'Consultar lista de cobranças com vencimento', value: 'pixListDueCharges' },
    ],
    default: 'pixCreateDueCharge',
    description: 'Selecione o endpoint que você deseja utilizar',
    displayOptions: {
      show: { transactionType: ['cobv'] },
    },
  },

  {
    displayName: 'Endpoints para Envio e Pagamento Pix',
    name: 'endpoints',
    type: 'options',
   
    options: [
      { name: 'Requisitar envio de Pix', value: 'pixSend' },
      { name: 'Consultar Pix enviado através do endToEndId', value: 'pixSendDetail' },
      { name: 'Consultar Pix enviado através do identificador da transação', value: 'pixSendDetailId' },
      { name: 'Consultar lista de Pix enviados', value: 'pixSendList' },
      { name: 'Detalhar QR Code Pix', value: 'pixQrCodeDetail' },
      { name: 'Pagar QR Code Pix', value: 'pixQrCodePay' },
    ],
    default: 'pixSend',
    description: 'Selecione o endpoint que você deseja utilizar',
    displayOptions: {
      show: { transactionType: ['payment'] },
    },
  },

  {
    displayName: 'Endpoints para Gestão de Pix',
    name: 'endpoints',
    type: 'options',
   
    options: [
      { name: 'Consultar Pix', value: 'pixDetailReceived' },
      { name: 'Consultar Pix recebidos', value: 'pixReceivedList' },
      { name: 'Solicitar devolução', value: 'pixDevolution' },
      { name: 'Consultar devolução', value: 'pixDetailDevolution' }
    ],
    default: 'pixDetailReceived',
    description: 'Selecione o endpoint que você deseja utilizar',
    displayOptions: {
      show: { transactionType: ['management'] },
    },
  },

  {
    displayName: 'Endpoints para Payload Locations',
    name: 'endpoints',
    type: 'options',
   
    options: [
      { name: 'Criar location do payload', value: 'pixCreateLocation' },
      { name: 'Consultar locations cadastradas', value: 'pixLocationList' },
      { name: 'Recuperar location do payload', value: 'pixDetailLocation' },
      { name: 'Gerar QR Code de um location', value: 'pixGenerateQRCode' },
      { name: 'Desvincular um txid de um location', value: 'pixUnlinkTxidLocation' },
    ],
    default: 'pixCreateLocation',
    description: 'Selecione o endpoint que você deseja utilizar',
    displayOptions: {
      show: { transactionType: ['location'] },
    },
  },

  {
    displayName: 'Endpoints para Cobranças com vencimento em lote',
    name: 'endpoints',
    type: 'options',
   
    options: [
      { name: 'Criar/Alterar lote de cobranças com vencimento', value: 'pixCreateDueChargeBatch' },
      { name: 'Revisar cobranças específicas de um lote', value: 'pixUpdateDueChargeBatch' },
      { name: 'Consultar lote de cobranças com vencimento', value: 'pixDetailDueChargeBatch' },
      { name: 'Consultar lista de lotes de cobranças com vencimento', value: 'pixListDueChargeBatch' },
    ],
    default: 'pixCreateDueChargeBatch',
    description: 'Selecione o endpoint que você deseja utilizar',
    displayOptions: {
      show: { transactionType: ['batch'] },
    },
  },

  {
    displayName: 'Endpoints para Split de pagamentos Pix',
    name: 'endpoints',
    type: 'options',
   
    options: [
      { name: 'Configuração de um Split de pagamento (sem passar id)', value: 'pixSplitConfig' },
      { name: 'Configuração de um Split de pagamento (com id)', value: 'pixSplitConfigId' },
      { name: 'Consultar configuração do Split por id', value: 'pixSplitDetailConfig' },
      { name: 'Criar uma cobrança', value: 'pixCreateCharge' },
      { name: 'Vincular uma cobrança a um Split de pagamento', value: 'pixSplitLinkCharge' },
      { name: 'Consultar cobrança com Split de pagamento por txid', value: 'pixSplitDetailCharge' },
      { name: 'Deletar o vínculo entre um Split de pagamento e uma cobrança', value: 'pixSplitUnlinkCharge' },
      { name: 'Criar uma cobrança com vencimento', value: 'pixCreateDueCharge' },
      { name: 'Vincular uma cobrança com vencimento a um Split de pagamento por txid', value: 'pixSplitLinkDueCharge' },
      { name: 'Consultar cobrança com vencimento e com Split de pagamento por txid', value: 'pixSplitDetailDueCharge' },
      { name: 'Deletar o vínculo entre um Split de pagamento e uma cobrança com vencimento', value: 'pixSplitUnlinkDueCharge' },
    ],
    default: 'pixSplitConfig',
    description: 'Selecione o endpoint que você deseja utilizar',
    displayOptions: {
      show: { transactionType: ['split'] },
    },
  },

  {
    displayName: 'Endpoints para Webhooks',
    name: 'endpoints',
    type: 'options',
   
    options: [
      { name: 'Configurar o webhook Pix', value: 'pixConfigWebhook' },
      { name: 'Exibir informações do webhook Pix', value: 'pixDetailWebhook' },
      { name: 'Consultar lista de webhooks', value: 'pixListWebhook' },
      { name: 'Cancelar o webhook Pix', value: 'pixDeleteWebhook' },
      { name: 'Reenviar webhook Pix', value: 'pixResendWebhook' },
    ],
    default: 'pixConfigWebhook',
    description: 'Selecione o endpoint que você deseja utilizar',
    displayOptions: {
      show: { transactionType: ['webhooks'] },
    },
  },

  {
    displayName: 'Endpoints exclusivos EfÍ',
    name: 'endpoints',
    type: 'options',
   
    options: [
      { name: 'Criar chave pix aleatória', value: 'pixCreateEvp' },
      { name: 'Listar chaves pix aleatórias', value: 'pixListEvp' },
      { name: 'Remover chave pix aleatória', value: 'pixDeleteEvp' },
      { name: 'Buscar o saldo da conta', value: 'getAccountBalance' },
      { name: 'Criar/modificar configurações da conta', value: 'updateAccountConfig' },
      { name: 'Listar configurações da conta', value: 'listAccountConfig' },
      { name: 'Listar infrações MED da conta', value: 'medList' },
      { name: 'Requisitar Extrato Conciliação', value: 'createReport' },
      { name: 'Solicitar Download Extrato Conciliação', value: 'detailReport' },
    ],
    default: 'pixCreateEvp',
    description: 'Selecione o endpoint que você deseja utilizar',
    displayOptions: {
      show: { transactionType: ['exclusives'] },
    },
  },

  ...cobConfig,
  ...cobvConfig,
  ...paymentConfig,
  ...managementConfig,
  ...locationConfig,
  ...batchConfig,
  ...splitConfig,
  ...webhooksConfig,
  ...exclusivesConfig  
];
