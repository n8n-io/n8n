/* eslint-disable n8n-nodes-base/node-param-options-type-unsorted-items */
import { INodeProperties } from 'n8n-workflow';
import { boletoConfig } from './properties/boletoConfig';
import { cartaoConfig } from './properties/cartaoConfig';
import { carneConfig } from './properties/carneConfig';
import { assinaturaConfig } from './properties/assinaturaConfig';
import { linkConfig } from './properties/linkConfig';
import { splitConfig } from './properties/splitConfig';
import { notificacaoConfig } from './properties/notificacaoConfig';

export const propertiesConfig: INodeProperties[] = [
  {
    displayName: 'Tipo de transação',
    name: 'transactionType',
    type: 'options',
    noDataExpression: true,
    options: [
      { name: 'Boleto', value: 'boleto' },
      { name: 'Cartão', value: 'cartao' },
      { name: 'Carnê', value: 'carne' },
			{ name: 'Assinatura', value: 'assinatura' },
			{ name: 'Link de Pagamento', value: 'link' },
			{ name: 'Split de Pagamento', value: 'split' },
			{ name: 'Notificações', value: 'notificacao' },
    ],
    default: 'boleto',
    description: 'Selecione o tipo da transação',
  },
  {
    displayName: 'Endpoints para Boleto',
    name: 'endpoints',
    type: 'options',
    options: [
				{	name: 'Criar Boleto One Step', value: 'criarBoletoOneStep'},
				{	name: 'Criar Transação', value: 'criarTransacaoBoleto'},
				{	name: 'Associar Forma de Pagamento', value: 'associarFormaPagamentoBoleto'},
				{	name: 'Retornar informações de cobrança existente',	value: 'retornarCobrancaBoleto'},
				{	name: 'Retornar lista de Cobranças do tipo boleto', value: 'retornarListaBoleto'},
				{	name: 'Incluir "notification_url" e "custom_id"',	value: 'incluirMetadataBoleto'},
				{ name: 'Alterar data de vencimento',	value: 'alterarVencimento'},
				{	name: 'Cancelar uma transação',	value: 'cancelarTransacaoBoleto'},
				{	name: 'Reenvio do boleto bancário para o email desejado',	value: 'reenviarEmailBoleto'},
				{	name: 'Acrescentar descrição ao histórico de uma transação', value: 'acrescentarHistoricoBoleto'},
				{	name: 'Definir que a transação será do tipo boleto balancete', value: 'definirBalancete'},
				{ name: 'Marcar como pago uma transação',	value: 'marcarComoPago'},
    ],
    default: 'criarBoletoOneStep',
    description: 'Selecione o endpoint que você deseja utilizar',
    displayOptions: {
      show: {
        transactionType: ['boleto'],
      },
    },
  },
  {
    displayName: 'Endpoints para Cartão',
    name: 'endpoints',
    type: 'options',
    options: [
      { name: 'Criar Cobrança via cartão One Step', value: 'criarCartaoOneStep'},
      { name: 'Criar Transação', value: 'criarTransacaoCartao'},
      { name: 'Associar Forma de Pagamento', value: 'associarFormaPagamentoCartao' },
			{ name: 'Retentativa de pagamento via cartão de crédito', value: 'retentativaPagamento'},
			{ name: 'Estorno de pagamento via cartão de crédito', value: 'estornoPagamento'},
			{ name: 'Retornar informações de cobrança existente', value: 'retornarCobrancaCartao'},
			{ name: 'Retornar lista de Cobranças do tipo cartão', value: 'retornarListaCartao'},
      { name: 'Incluir "notification_url" e "custom_id"', value: 'incluirMetadataCartao'},
      { name: 'Cancelar uma transação', value: 'cancelarTransacaoCartao'},
      { name: 'Acrescentar descrição ao histórico de uma transação', value: 'acrescentarHistoricoCartao'},
			{ name: 'Listar parcelas de acordo com a bandeira do cartão', value: 'listarParcelas'},
		],
    default: 'criarCartaoOneStep',
    description: 'Selecione o endpoint para Cartão',
    displayOptions: {
      show: {
        transactionType: ['cartao'],
      },
    },
  },
  {
    displayName: 'Endpoints para Carnê',
    name: 'endpoints',
    type: 'options',
    options: [
      { name: 'Criar Carnê', value: 'criarCarne' },
      { name: 'Retornar Carnê', value: 'retornarCarne' },
      { name: 'Retornar lista de Carnês', value: 'retornarListaCarnes' },
      { name: 'Incluir Metadata no Carnê', value: 'incluirMetadataCarne' },
      { name: 'Alterar Vencimento de Parcela', value: 'alterarVencimentoParcela' },
      { name: 'Alterar Vencimento de Parcelas', value: 'alterarVencimentoParcelas' },
      { name: 'Cancelar Carnê', value: 'cancelarCarne' },
      { name: 'Cancelar Parcela de Carnê', value: 'cancelarParcelaCarne' },
      { name: 'Reenvio de Carnê para o E-mail', value: 'reenvioCarne' },
      { name: 'Reenvio de Parcela de Carnê para o E-mail', value: 'reenvioParcelaCarne' },
      { name: 'Acrescentar Histórico ao Carnê', value: 'acrescentarHistoricoCarne' },
      { name: 'Marcar Carnê Como Pago', value: 'marcarComoPagoCarne' },
      { name: 'Marcar Parcela de Carnê Como Pago', value: 'marcarComoPagoParcelaCarne' },
    ],
    default: 'criarCarne',
    description: 'Selecione o endpoint para Carnê',
    displayOptions: {
      show: {
        transactionType: ['carne'],
      },
    },
  },

	{
    displayName: 'Endpoints para Assinatura',
    name: 'endpoints',
    type: 'options',
    options: [
				{	name: 'Criar o plano de assinatura', value: 'criarPlanoAssinatura'},
				{ name: 'Retornar informações de um plano',	value: 'retornarInformacoesPlano'},
				{ name: 'Permitir a edição do nome do plano de assinatura',	value: 'editarNomePlano'},
				{ name: 'Cancelar um plano de assinatura',	value: 'cancelarPlanoAssinatura'},
				{	name: 'Criar inscrições (assinaturas) para vincular ao plano em One Step',	value: 'criarInscricoesOneStep'},
				{	name: 'Criar inscrições (assinaturas) para vincular ao plano em Two Steps', value: 'criarInscricoesTwoSteps'},
				{	name: 'Defina a forma de pagamento da assinatura e os dados do cliente',	value: 'definirFormaPagamento'},
				{	name: 'Retentativa de pagamento de assinatura via cartão de crédito', value: 'retentativaCartao'},
				{	name: 'Retornar informações de uma assinatura vinculada a um plano', value: 'retornarAssinaturaVinculada'},
				{ name: 'Retornar lista de cobranças vinculadas às assinaturas',	value: 'retornarListaCobrancas'},
				{	name: 'Associar plano ao link de pagamento', value: 'associarPlanoLink'},
				{	name: 'Incluir "notification_url" e "custom_id" em uma assinatura existente',	value: 'incluirMetadataAssinatura'},
				{	name: 'Alterar dados de uma assinatura', value: 'alterarDadosAssinatura'},
				{	name: 'Cancelar uma assinatura', value: 'cancelarAssinatura'},
				{ name: 'Acrescentar descrição ao histórico de uma assinatura',	value: 'historicoAssinatura'},
				{	name: 'Reenvio do link associado ao plano para o email desejado',	value: 'reenvioEmailAssinatura'},
    ],
    default: 'criarPlanoAssinatura',
    description: 'Selecione o endpoint que você deseja utilizar',
    displayOptions: {
      show: {
        transactionType: ['assinatura'],
      },
    },
  },

	{
    displayName: 'Endpoints para Link de pagamento',
    name: 'endpoints',
    type: 'options',
    options: [
				{	name: 'Criar link de pagamento em One Step', value: 'criarLinkOneStep'},
				{	name: 'Criar Transação', value: 'criarTransacaoLink'},
				{	name: 'Criar um link de pagamento', value: 'associarFormaPagamentoLink'},
				{	name: 'Retornar informações de um link de pagamento',	value: 'retornarLink'},
				{	name: 'Incluir "notification_url" e "custom_id"',	value: 'incluirMetadataLink'},
				{ name: 'Alterar determinados parâmetros/atributos de um link de pagamento existente',	value: 'alterarLink'},
				{	name: 'Cancelar um link de pagamento existente',	value: 'cancelarTransacaoLink'},
				{	name: 'Acrescentar descrição ao histórico de uma transação', value: 'acrescentarHistoricoLink'},
				{	name: 'Reenviar link de pagamento por e-mail',	value: 'reenviarEmailLink'},
    ],
    default: 'criarLinkOneStep',
    description: 'Selecione o endpoint que você deseja utilizar',
    displayOptions: {
      show: {
        transactionType: ['link'],
      },
    },
  },
	{
    displayName: 'Endpoints para Split de pagamento',
    name: 'endpoints',
    type: 'options',
    options: [
				{	name: 'Criar transação Split de pagamento em One Step - Boleto', value: 'criarSplitOneStepBoleto'},
				{	name: 'Criar transação Split de pagamento em One Step - Cartão', value: 'criarSplitOneStepCartao'},
				{	name: 'Criar Transação Split', value: 'criarTransacaoSplit'},
				{	name: 'Associar Forma de Pagamento - Boleto', value: 'associarFormaPagamentoSplitBoleto'},
				{	name: 'Associar Forma de Pagamento - Cartão', value: 'associarFormaPagamentoSplitCartao'},
    ],
    default: 'criarSplitOneStepBoleto',
    description: 'Selecione o endpoint que você deseja utilizar',
    displayOptions: {
      show: {
        transactionType: ['split'],
      },
    },
	},
	{
		displayName: 'Endpoint para Notificação',
		name: 'endpoints',
		type: 'options',
		options: [
				{	name: 'Consultar notificação', value: 'consultarNotificacao'},
		],
		default: 'consultarNotificacao',
		description: 'Selecione o endpoint que você deseja utilizar',
		displayOptions: {
			show: {
				transactionType: ['notificacao'],
			},
		},
  },
  ...boletoConfig,
	...cartaoConfig,
  ...carneConfig,
	...assinaturaConfig,
	...linkConfig,
	...splitConfig,
	...notificacaoConfig
];
