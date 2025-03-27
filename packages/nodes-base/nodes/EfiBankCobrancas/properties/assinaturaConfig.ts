/* eslint-disable n8n-nodes-base/node-param-placeholder-missing-email */
import { INodeProperties } from 'n8n-workflow';

export const assinaturaConfig: INodeProperties[] = [

	// ID do Plano
  {
    displayName: 'plan_id',
    name: 'planId',
    type: 'string',
    default: '',
    description: 'Insira o id do plano',
    displayOptions: {
      show: {
        endpoints: [
          'editarNomePlano',
          'cancelarPlanoAssinatura',
          'criarInscricoesOneStep',
          'criarInscricoesTwoSteps',
          'associarPlanoLink'
        ],
      },
    },
  },

   // ID da inscrição
   {
    displayName: 'subcription_id',
    name: 'subscriptionId',
    type: 'string',
    default: '',
    description: 'Insira o id da assinatura',
    displayOptions: {
      show: {
        endpoints: [
          'definirFormaPagamento',
          'retornarAssinaturaVinculada',
          'incluirMetadataAssinatura',
          'alterarDadosAssinatura',
          'cancelarAssinatura',
          'historicoAssinatura'
        ],
      },
    },
  },

	{
    displayName: 'charge_id',
    name: 'chargeId',
    type: 'string',
    default: '',
    description: 'Insira o id da cobrança',
    displayOptions: {
      show: {
        endpoints: ['reenvioEmailAssinatura', 'retentativaCartao'],
      },
    },
  },

  // Criar o plano de assinatura
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyPlanoAssinatura',
    type: 'json',
    default: `{
  "name": "Plano de Internet - Velocidade 10 Mb",
  "interval": 1,
  "repeats": 12
}`,
    description: 'Insira o body da requisição para criar um plano de assinatura',
    displayOptions: {
      show: {
        endpoints: ['criarPlanoAssinatura'],
      },
    },
  },

  // Retentativa de pagamento de assinatura via cartão de crédito
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyRetentativaPagamento',
    type: 'json',
    default: `{
  "payment": {
    "credit_card": {
      "customer": {
        "name": "Gorbadoc Oldbuck",
        "cpf": "94271564656",
        "email": "email_do_cliente@servidor.com.br",
        "birth": "1990-08-29",
        "phone_number": "5144916523"
      },
      "billing_address": {
        "street": "Avenida Juscelino Kubitschek",
        "number": "909",
        "neighborhood": "Bauxita",
        "zipcode": "35400000",
        "city": "Ouro Preto",
        "complement": "",
        "state": "MG"
      },
      "payment_token": "75bfce47d230b550f7eaac2a932e0878a934cb3",
      "update_card": true
    }
  }
}`,
    description: 'Insira o body da requisição para realizar uma retentativa de pagamento',
    displayOptions: {
      show: {
        endpoints: ['retentativaCartao'],
      },
    },
  },


  // Editar o nome do plano de assinatura
  {
    displayName: 'Nome do plano',
    name: 'nome_plano',
    type: 'string',
    default: '',
    description: 'Insira o novo nome do plano',
    displayOptions: {
      show: {
        endpoints: ['editarNomePlano'],
      },
    },
  },

  // Criar inscrições (assinaturas) para vincular ao plano em One Step
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyInscricaoOneStep',
    type: 'json',
    default: `{
  "items": [{
    "name": "Meu Produto",
    "value": 5990,
    "amount": 1
  }],
  "payment": {
    "banking_billet": {
      "customer": {
        "name": "Gorbadoc Oldbuck",
        "cpf": "94271564656",
        "email": "email_do_cliente@servidor.com.br",
        "phone_number": "5144916523",
        "address": {
          "street": "Avenida Juscelino Kubitschek",
          "number": "909",
          "neighborhood": "Bauxita",
          "zipcode": "35400000",
          "city": "Ouro Preto",
          "complement": "",
          "state": "MG"
        }
      },
      "expire_at": "2032-12-30",
      "configurations": {
        "fine": 200,
        "interest": 33
      },
      "message": "Pague pelo código de barras ou pelo QR Code"
    }
  }
}`,
    description: 'Insira o body da requisição para criar uma assinatura em One Step',
    displayOptions: {
      show: {
        endpoints: ['criarInscricoesOneStep'],
      },
    },
  },

  // Criar inscrições (assinaturas) para vincular ao plano em Two Steps
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyInscricaoTwoSteps',
    type: 'json',
    default: `{
  "items": [{
    "name": "Internet - Mensalidade",
    "value": 6990,
    "amount": 1
  }]
}`,
    description: 'Insira o body da requisição para criar uma assinatura em Two Steps',
    displayOptions: {
      show: {
        endpoints: ['criarInscricoesTwoSteps'],
      },
    },
  },

  // Definir a forma de pagamento da assinatura e os dados do cliente
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyFormaPagamento',
    type: 'json',
    default: `{
  "payment": {
    "banking_billet": {
      "customer": {
        "name": "Gorbadoc Oldbuck",
        "cpf": "94271564656",
        "email": "email_do_cliente@servidor.com.br",
        "phone_number": "5144916523",
        "address": {
          "street": "Avenida Juscelino Kubitschek",
          "number": "909",
          "neighborhood": "Bauxita",
          "zipcode": "35400000",
          "city": "Ouro Preto",
          "complement": "",
          "state": "MG"
        }
      },
      "expire_at": "2032-12-30",
      "configurations": {
        "fine": 200,
        "interest": 33
      },
      "message": "Pague pelo código de barras ou pelo QR Code"
    }
  }
}`,
    description: 'Insira o body da requisição para definir a forma de pagamento de uma assinatura',
    displayOptions: {
      show: {
        endpoints: ['definirFormaPagamento'],
      },
    },
  },

  // Associar plano ao link de pagamento
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyAssociarPlanoLink',
    type: 'json',
    default: `{
  "items": [{
    "amount": 2,
    "name": "Silicon Valley",
    "value": 564
  }],
  "metadata": {
    "custom_id": "Assinatura",
    "notification_url": "https://www.meusite.com.br/notificacoes/"
  },
  "settings": {
    "payment_method": "all",
    "expire_at": "2032-02-08",
    "request_delivery_address": true
  }
}`,
    description: 'Insira o body da requisição para associar o plano ao link de pagamento',
    displayOptions: {
      show: {
        endpoints: ['associarPlanoLink'],
      },
    },
  },

  // Retornar Lista de Cobranças
  {
    displayName: 'begin_date',
    name: 'begin_date',
    type: 'string',
    default: '2025-01-01',
    required: true,
    description: 'Data início para o filtro da consulta',
    displayOptions: {
      show: {
        endpoints: ['retornarListaCobrancas'],
      },
    },
  },

  {
    displayName: 'end_date',
    name: 'end_date',
    type: 'string',
    default: '2025-12-31',
    required: true,
    description: 'Data fim para o filtro da consulta',
    displayOptions: {
      show: {
        endpoints: ['retornarListaCobrancas'],
      },
    },
  },

  // Incluir "notification_url" e "custom_id" em uma assinatura existente
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyIncluirMetadata',
    type: 'json',
    default: `{
  "notification_url": "https://www.meusite.com.br/notificacoes/",
  "custom_id": "REF0001"
}`,
    description: 'Insira o body da requisição para incluir metadata em uma assinatura existente',
    displayOptions: {
      show: {
        endpoints: ['incluirMetadataAssinatura'],
      },
    },
  },

  // Alterar dados de uma assinatura
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyAlterarDadosAssinatura',
    type: 'json',
    default: `{
  "plan_id": 3,
  "customer": {
    "email": "gorbadoc.oldbuck@gmail.com",
    "phone_number": "31123456789"
  },
  "items": [{
    "name": "Product 1",
    "value": 1000,
    "amount": 1
  }],
  "shippings": [{
    "name": "frete",
    "value": 1800
  }],
  "payment_token": ""
}`,
    description: 'Insira o body da requisição para alterar dados de uma assinatura do tipo cartão de crédito',
    displayOptions: {
      show: {
        endpoints: ['alterarDadosAssinatura'],
      },
    },
  },

  // Acrescentar descrição ao histórico de uma assinatura
  {
    displayName: 'Descrição',
    name: 'requestBodyHistorico',
    type: 'string',
    default: '',
    description: 'Insira a descrição para adicionar ao histórico',
    displayOptions: {
      show: {
        endpoints: ['historicoAssinatura'],
      },
    },
  },

  // Reenvio do link associado ao plano para o email desejado

  {
    displayName: 'email',
    name: 'email',
    type: 'string',
    placeholder: 'name@email.com',
    default: '',
    description: 'Insira o email para reenviar o link',
    displayOptions: {
      show: {
        endpoints: ['reenvioEmailAssinatura'],
      },
    },
  },
];
