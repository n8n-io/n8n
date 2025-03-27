import type {
	ActionResultRequestDto,
	OptionsRequestDto,
	ResourceLocatorRequestDto,
	ResourceMapperFieldsRequestDto,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { INodeTranslationHeaders, IRestApiContext } from '@/Interface';
import type {
	INodeListSearchResult,
	INodePropertyOptions,
	INodeTypeDescription,
	INodeTypeNameVersion,
	NodeParameterValueType,
	ResourceMapperFields,
} from 'n8n-workflow';
import axios from 'axios';

// TODO: remove this
const nodesPreview = [
	{
		displayName: 'ChatWoot PREWIEW',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume ChatWoot API',
		defaults: { name: 'ChatWoot' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Public', value: 'public' },
				],
				default: 'public',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{
						name: 'Information',
						value: 'accountInformation',
						description: 'Get details about an account',
						action: 'Information about an account',
					},
				],
				default: 'accountInformation',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['contact'] } },
				options: [
					{
						name: 'Get Contact Details',
						value: 'contactDetails',
						description: 'Retrieve Contact Details',
						action: 'Contact details',
					},
					{
						name: 'Search Contacts',
						value: 'contactSearch',
						description: 'Search Contacts By name|identifier|email|phone_number',
						action: 'Contact search',
					},
					{
						name: 'Update | Patch',
						value: 'contactUpdate',
						description: 'Update Contact Details',
						action: 'Contact update',
					},
					{
						name: 'Create',
						value: 'contactCreate',
						description: 'Update Create',
						action: 'Contact create',
					},
				],
				default: 'contactDetails',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['public'] } },
				options: [
					{
						name: 'Create Contact',
						value: 'publicContactCreate',
						action: 'Create contact a public',
					},
					{
						name: 'Create Conversation',
						value: 'conversation',
						action: 'Create conversation a public',
					},
					{ name: 'Create Message', value: 'messageCreate', action: 'Create message a public' },
					{
						name: 'Get All Conversation',
						value: 'conversations',
						action: 'Get all conversation a public',
					},
					{ name: 'Get All Messages', value: 'messages', action: 'Get all messages a public' },
					{ name: 'Get Contact Details', value: 'contact', action: 'Get contact details a public' },
				],
				default: 'messages',
			},
		],
		iconUrl:
			'https://raw.githubusercontent.com/sufficit/n8n-nodes-chatwoot/refs/heads/master/nodes/ChatWoot/chatwoot.svg',
		name: 'n8n-nodes-preview-chatwoot.chatwoot',
	},
	{
		displayName: 'Evolution API Preview',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Interact with Evolution API',
		defaults: { name: 'Evolution API' },
		inputs: ['main'],
		outputs: ['main'],
		requestDefaults: {
			baseURL: 'https://doc.evolution-api.com/api-reference',
			url: '',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		},
		properties: [
			{
				displayName: 'Recurso',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Instancia', value: 'instances-api' },
					{ name: 'Mensagem', value: 'messages-api' },
					{ name: 'Grupo', value: 'groups-api' },
					{ name: 'Chat', value: 'chat-api' },
					{ name: 'Perfil', value: 'profile-api' },
					{ name: 'Evento', value: 'events-api' },
					{ name: 'Integração', value: 'integrations-api' },
					{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
				],
				default: 'instances-api',
			},
			{
				displayName: 'Operação',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['instances-api'] } },
				options: [
					{
						name: 'Criar Instancia',
						action: 'Criar instancia',
						description: 'Cria uma nova Instancia',
						value: 'instance-basic',
					},
					{
						name: 'Conectar Instancia',
						action: 'Conectar instancia',
						description: 'Gera a conexão de uma Instancia (QR ou Base64)',
						value: 'instance-connect',
					},
					{
						name: 'Buscar Instancia',
						action: 'Buscar instancia',
						description: 'Busca e lista as Instancias criadas',
						value: 'fetch-instances',
					},
					{
						name: 'Definir Comportamento',
						action: 'Definir comportamento',
						description: 'Define o comportamento da instancia',
						value: 'instance-settings',
					},
					{
						name: 'Definir Presença',
						action: 'Definir presen a',
						description: 'Define a presença na instancia',
						value: 'set-presence',
					},
					{
						name: 'Definir/Buscar Proxy',
						action: 'Proxy',
						description: 'Define um Proxy na instancia',
						value: 'set-proxy',
					},
					{
						name: 'Reiniciar Instancia',
						action: 'Reiniciar instancia',
						description: 'Reinicia o socket da Instancia',
						value: 'restart-instance',
					},
					{
						name: 'Desconectar Instancia',
						action: 'Desconectar instancia',
						description: 'Desconecta o WhatsApp da Instancia',
						value: 'logout-instance',
					},
					{
						name: 'Deletar Instancia',
						action: 'Deletar instancia',
						description: 'Deleta uma Instancia',
						value: 'delete-instance',
					},
					{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
				],
				default: 'instance-basic',
			},
			{
				displayName: 'Operação',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['messages-api'] } },
				options: [
					{
						name: 'Enviar Texto',
						action: 'Enviar texto',
						description: 'Envia mensagem de Texto',
						value: 'send-text',
					},
					{
						name: 'Enviar Imagem',
						action: 'Enviar imagem',
						description: 'Envia mensagem de Imagem',
						value: 'send-image',
					},
					{
						name: 'Enviar Video',
						action: 'Enviar video',
						description: 'Enviar mensagem de Video',
						value: 'send-video',
					},
					{
						name: 'Enviar Audio',
						action: 'Enviar audio',
						description: 'Enviar mensagem de Audio',
						value: 'send-audio',
					},
					{
						name: 'Enviar Documento',
						action: 'Enviar documento',
						description: 'Enviar mensagem com Documento',
						value: 'send-document',
					},
					{
						name: 'Enviar Enquete',
						action: 'Enviar enquete',
						description: 'Envia uma Enquete de até 12 opções',
						value: 'send-poll',
					},
					{
						name: 'Enviar Contato',
						action: 'Enviar contato',
						description: 'Envia um contato no whatsapp',
						value: 'send-contact',
					},
					{
						name: 'Enviar Lista',
						action: 'Enviar lista',
						description: 'Envia uma lista de opções interativa',
						value: 'send-list',
					},
					{
						name: 'Enviar Botões',
						action: 'Enviar bot es',
						description: 'Envia mensagem com botões interativos',
						value: 'send-buttons',
					},
					{
						name: 'Enviar PIX',
						action: 'Enviar PIX',
						description: 'Envia botão de pagamento PIX',
						value: 'send-pix',
					},
					{
						name: 'Enviar Status',
						action: 'Enviar status',
						description: 'Publicar um Status/Stories',
						value: 'send-stories',
					},
					{
						name: 'Reagir Mensagem',
						action: 'Reagir mensagem',
						description: 'Adiciona uma reação em uma mensagem',
						value: 'send-reaction',
					},
					{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
				],
				default: 'send-text',
			},
			{
				displayName: 'Operação',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['groups-api'] } },
				options: [
					{
						name: 'Criar Grupo',
						action: 'Criar um novo grupo',
						description: 'Cria um novo grupo no WhatsApp',
						value: 'create-group',
					},
					{
						name: 'Atualizar Imagem Do Grupo',
						action: 'Atualizar imagem do grupo',
						description: 'Atualiza a imagem de perfil do grupo',
						value: 'update-group-picture',
					},
					{
						name: 'Atualizar Nome Do Grupo',
						action: 'Atualizar nome do grupo',
						description: 'Atualiza o nome/título do grupo',
						value: 'update-group-name',
					},
					{
						name: 'Atualizar Descrição Do Grupo',
						action: 'Atualizar descri o do grupo',
						description: 'Atualiza a descrição do grupo',
						value: 'update-group-description',
					},
					{
						name: 'Atualizar Configurações',
						action: 'Atualizar configura es do grupo',
						description: 'Atualiza as configurações de permissões do grupo',
						value: 'update-settings',
					},
					{
						name: 'Atualizar Membros',
						action: 'Atualizar membros do grupo',
						description: 'Adiciona, remove ou atualiza permissões de membros',
						value: 'update-participants',
					},
					{
						name: 'Buscar Link De Convite',
						action: 'Buscar link de convite',
						description: 'Obtém o link de convite do grupo',
						value: 'fetch-invite-code',
					},
					{
						name: 'Revogar Link De Convite',
						action: 'Revogar link de convite',
						description: 'Revoga o link de convite atual do grupo',
						value: 'revoke-invite-code',
					},
					{
						name: 'Enviar Link De Convite',
						action: 'Enviar link de convite',
						description: 'Envia o link de convite do grupo para contatos',
						value: 'send-invite-link',
					},
					{
						name: 'Buscar Grupos',
						action: 'Buscar grupos',
						description: 'Busca informações de grupos por diferentes métodos',
						value: 'fetch-groups',
					},
					{
						name: 'Encontrar Participantes',
						action: 'Encontrar participantes do grupo',
						description: 'Obtém a lista de participantes de um grupo',
						value: 'find-participants',
					},
					{
						name: 'Mensagens Temporárias',
						action: 'Configurar mensagens tempor rias',
						description: 'Define o tempo de expiração das mensagens no grupo',
						value: 'toggle-ephemeral',
					},
					{
						name: 'Entrar No Grupo',
						action: 'Entrar no grupo',
						description: 'Entra em um grupo usando o código de convite',
						value: 'join-group',
					},
					{
						name: 'Sair Do Grupo',
						action: 'Sair do grupo',
						description: 'Remove a instância do grupo',
						value: 'leave-group',
					},
					{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
				],
				default: 'create-group',
			},
			{
				displayName: 'Operação',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['events-api'] } },
				options: [
					{
						name: 'Webhook',
						action: 'Webhook',
						description: 'Define/Busca integração com Webhook',
						value: 'webhook',
					},
					{
						name: 'RabbitMQ',
						action: 'Rabbitmq',
						description: 'Define/Busca integração com RabbitMQ',
						value: 'rabbitmq',
					},
					{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
				],
				default: 'webhook',
			},
			{
				displayName: 'Operação',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['integrations-api'] } },
				options: [
					{
						name: 'Chatwoot',
						action: 'Chatwoot',
						description: 'Define/Busca integração com Chatwoot',
						value: 'chatwoot',
					},
					{
						name: 'Evolution Bot',
						action: 'Evolution bot',
						description: 'Controla a integração com Evolution Bot',
						value: 'evolution-bot',
					},
					{
						name: 'Typebot',
						action: 'Typebot',
						description: 'Controla a integração com Typebot',
						value: 'typebot',
					},
					{
						name: 'Dify',
						action: 'Dify',
						description: 'Controla a integração com Dify',
						value: 'difyBot',
					},
					{
						name: 'Flowise',
						action: 'Flowise',
						description: 'Controla a integração com Flowise',
						value: 'flowiseBot',
					},
					{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
				],
				default: 'chatwoot',
			},
			{
				displayName: 'Operação',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['profile-api'] } },
				options: [
					{
						name: 'Buscar Perfil',
						value: 'fetch-profile',
						description: 'Busca informações do perfil',
						action: 'Buscar perfil',
					},
					{
						name: 'Buscar Perfil Profissional',
						value: 'fetch-business-profile',
						description: 'Busca informações do perfil profissional',
						action: 'Buscar perfil profissional',
					},
					{
						name: 'Atualizar Nome Do Perfil',
						value: 'update-profile-name',
						description: 'Atualiza o nome do perfil',
						action: 'Atualizar nome do perfil',
					},
					{
						name: 'Atualizar Status',
						value: 'update-profile-status',
						description: 'Atualiza o status do perfil',
						action: 'Atualizar status do perfil',
					},
					{
						name: 'Atualizar Foto Do Perfil',
						value: 'update-profile-picture',
						description: 'Atualiza a foto do perfil',
						action: 'Atualizar foto do perfil',
					},
					{
						name: 'Remover Foto Do Perfil',
						value: 'remove-profile-picture',
						description: 'Remove a foto do perfil',
						action: 'Remover foto do perfil',
					},
					{
						name: 'Buscar Configurações De Privacidade',
						value: 'fetch-privacy-settings',
						description: 'Busca as configurações de privacidade da instância',
						action: 'Buscar configura es de privacidade',
					},
					{
						name: 'Atualizar Configurações De Privacidade',
						value: 'update-privacy-settings',
						description: 'Atualiza as configurações de privacidade da instância',
						action: 'Atualizar configura es de privacidade',
					},
					{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
				],
				default: 'fetch-profile',
			},
			{
				displayName: 'Operação',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['chat-api'] } },
				options: [
					{
						name: 'Verificar Número',
						action: 'Verificar n mero no whats app',
						description: 'Verifica se um número está registrado no WhatsApp',
						value: 'check-number',
					},
					{
						name: 'Ler Mensagens',
						action: 'Marcar mensagens como lidas',
						description: 'Marca mensagens específicas como lidas',
						value: 'read-messages',
					},
					{
						name: 'Gerenciar Arquivo',
						action: 'Gerenciar arquivo de conversa',
						description: 'Arquiva ou desarquiva uma conversa',
						value: 'manage-archive',
					},
					{
						name: 'Marcar Como Não Lido',
						action: 'Marcar conversa como n o lida',
						description: 'Marca uma conversa específica como não lida',
						value: 'mark-unread',
					},
					{
						name: 'Deletar Mensagem',
						action: 'Deletar mensagem',
						description: 'Deleta uma mensagem específica para todos',
						value: 'delete-message',
					},
					{
						name: 'Buscar Foto Do Perfil',
						action: 'Buscar foto do perfil',
						description: 'Obtém a URL da foto do perfil de um contato',
						value: 'fetch-profile-picture',
					},
					{
						name: 'Obter Mídia Em Base64',
						action: 'Obter m dia em base64',
						description: 'Obtém o conteúdo de uma mídia em formato Base64',
						value: 'get-media-base64',
					},
					{
						name: 'Editar Mensagem',
						action: 'Editar mensagem',
						description: 'Edita uma mensagem enviada anteriormente',
						value: 'update-message',
					},
					{
						name: 'Enviar Presença',
						action: 'Enviar presen a',
						description: 'Envia o status de presença (digitando/gravando) para um contato',
						value: 'send-presence',
					},
					{
						name: 'Bloquear Contato',
						action: 'Bloquear contato',
						description: 'Bloqueia ou desbloqueia um contato',
						value: 'block-contact',
					},
					{
						name: 'Listar Contatos',
						action: 'Listar contatos',
						description: 'Lista todos os contatos ou busca um contato específico',
						value: 'find-contacts',
					},
					{
						name: 'Procurar Mensagens',
						action: 'Procurar mensagens de um contato',
						description: 'Busca mensagens de um contato específico',
						value: 'find-messages',
					},
					{
						name: 'Procurar Status',
						action: 'Procurar status de mensagens',
						description: 'Busca status de mensagens de um contato específico',
						value: 'find-status-messages',
					},
					{
						name: 'Procurar Chats',
						action: 'Procurar chats',
						description: 'Busca chats de um contato específico',
						value: 'find-chats',
					},
					{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
				],
				default: 'check-number',
			},
		],
		iconUrl:
			'https://raw.githubusercontent.com/oriondesign2015/n8n-nodes-evolution-api/refs/heads/main/nodes/EvolutionApi/evolutionapi.svg',
		name: 'n8n-nodes-preview-evolution-api.evolutionApi',
	},
	{
		displayName: 'Global Constants PREWIEW',
		group: ['transform', 'output'],
		version: 1,
		description: 'Global Constants',
		subtitle: '={{$parameter["resource"]}}',
		defaults: { name: 'Global Constants' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
		iconUrl:
			'https://raw.githubusercontent.com/umanamente/n8n-nodes-globals/master/nodes/GlobalConstants/globals-icon-60px.png',
		name: 'n8n-nodes-preview-globals.globalConstants',
	},
	// {
	// 	displayName: 'Kommo PREWIEW',
	// 	group: ['output'],
	// 	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	// 	description: 'Consume Kommo API',
	// 	defaultVersion: 1,
	// 	version: 1,
	// 	defaults: { name: 'Kommo API Node' },
	// 	inputs: ['main'],
	// 	outputs: ['main'],
	// 	properties: [
	// 		{
	// 			displayName: 'Resource',
	// 			name: 'resource',
	// 			type: 'options',
	// 			noDataExpression: true,
	// 			options: [
	// 				{ name: 'Account', value: 'account' },
	// 				{ name: 'Company', value: 'companies' },
	// 				{ name: 'Contact', value: 'contacts' },
	// 				{ name: 'Lead', value: 'leads' },
	// 				{ name: 'List', value: 'lists' },
	// 				{ name: 'Note', value: 'notes' },
	// 				{ name: 'Task', value: 'tasks' },
	// 				{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
	// 			],
	// 			default: 'account',
	// 		},
	// 		{
	// 			displayName: 'Operation',
	// 			name: 'operation',
	// 			type: 'options',
	// 			noDataExpression: true,
	// 			displayOptions: { show: { resource: ['account'] } },
	// 			options: [
	// 				{
	// 					name: 'Get Info',
	// 					value: 'getInfo',
	// 					description: 'Get account info',
	// 					action: 'Get account info',
	// 				},
	// 				{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
	// 			],
	// 			default: 'getInfo',
	// 		},
	// 		{
	// 			displayName: 'Operation',
	// 			name: 'operation',
	// 			type: 'options',
	// 			noDataExpression: true,
	// 			displayOptions: { show: { resource: ['companies'] } },
	// 			options: [
	// 				{
	// 					name: 'Get Companies List',
	// 					value: 'getCompany',
	// 					description: 'Get list of companies',
	// 					action: 'Get list of companies',
	// 				},
	// 				{
	// 					name: 'Create',
	// 					value: 'createCompany',
	// 					description: 'Create new companies',
	// 					action: 'Create new companies',
	// 				},
	// 				{
	// 					name: 'Update',
	// 					value: 'updateCompany',
	// 					description: 'Update companies',
	// 					action: 'Update companies',
	// 				},
	// 				{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
	// 			],
	// 			default: 'getCompany',
	// 		},
	// 		{
	// 			displayName: 'Operation',
	// 			name: 'operation',
	// 			type: 'options',
	// 			noDataExpression: true,
	// 			displayOptions: { show: { resource: ['contacts'] } },
	// 			options: [
	// 				{
	// 					name: 'Get Contacts List',
	// 					value: 'getContacts',
	// 					description: 'Get list of contacts',
	// 					action: 'Get list of contacts',
	// 				},
	// 				{
	// 					name: 'Create Contacts',
	// 					value: 'createContacts',
	// 					description: 'Create new contacts',
	// 					action: 'Create new contacts',
	// 				},
	// 				{
	// 					name: 'Update Contacts',
	// 					value: 'updateContacts',
	// 					description: 'Update contacts by ID',
	// 					action: 'Update contacts',
	// 				},
	// 				{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
	// 			],
	// 			default: 'getContacts',
	// 		},
	// 		{
	// 			displayName: 'Operation',
	// 			name: 'operation',
	// 			type: 'options',
	// 			noDataExpression: true,
	// 			displayOptions: { show: { resource: ['leads'] } },
	// 			options: [
	// 				{
	// 					name: 'Get Lead List',
	// 					value: 'getLeads',
	// 					description: 'Get list of leads',
	// 					action: 'Get list of leads',
	// 				},
	// 				{
	// 					name: 'Create Leads',
	// 					value: 'createLeads',
	// 					description: 'Create new leads',
	// 					action: 'Create new leads',
	// 				},
	// 				{
	// 					name: 'Update Leads',
	// 					value: 'updateLeads',
	// 					action: 'Update leads',
	// 					description: 'Update leads by ID',
	// 				},
	// 				{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
	// 			],
	// 			default: 'getLeads',
	// 		},
	// 		{
	// 			displayName: 'Operation',
	// 			name: 'operation',
	// 			type: 'options',
	// 			noDataExpression: true,
	// 			displayOptions: { show: { resource: ['tasks'] } },
	// 			options: [
	// 				{
	// 					name: 'Get Task List',
	// 					value: 'getTasks',
	// 					description: 'Get list of tasks',
	// 					action: 'Get list of tasks',
	// 				},
	// 				{
	// 					name: 'Create Tasks',
	// 					value: 'createTasks',
	// 					description: 'Create new tasks',
	// 					action: 'Create new tasks',
	// 				},
	// 				{
	// 					name: 'Update Tasks',
	// 					value: 'updateTasks',
	// 					action: 'Update tasks',
	// 					description: 'Update tasks by ID',
	// 				},
	// 				{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
	// 			],
	// 			default: 'getTasks',
	// 		},
	// 		{
	// 			displayName: 'Operation',
	// 			name: 'operation',
	// 			type: 'options',
	// 			noDataExpression: true,
	// 			displayOptions: { show: { resource: ['notes'] } },
	// 			options: [
	// 				{
	// 					name: 'Get Notes List',
	// 					value: 'getNotes',
	// 					description: 'Get list of notes',
	// 					action: 'Get list of notes',
	// 				},
	// 				{
	// 					name: 'Create Notes',
	// 					value: 'createNotes',
	// 					description: 'Create new notes',
	// 					action: 'Create new notes',
	// 				},
	// 				{
	// 					name: 'Update Notes',
	// 					value: 'updateNotes',
	// 					action: 'Update notes',
	// 					description: 'Update notes by ID',
	// 				},
	// 				{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
	// 			],
	// 			default: 'getNotes',
	// 		},
	// 		{
	// 			displayName: 'Operation',
	// 			name: 'operation',
	// 			type: 'options',
	// 			noDataExpression: true,
	// 			displayOptions: { show: { resource: ['lists'] } },
	// 			options: [
	// 				{
	// 					name: 'Create List Elements',
	// 					value: 'addListElements',
	// 					action: 'Add multiple list elements into the account',
	// 					description: 'Add multiple list elements into the account',
	// 				},
	// 				{
	// 					name: 'Create Lists',
	// 					value: 'addLists',
	// 					description: 'Add multiple lists',
	// 					action: 'Add multiple lists',
	// 				},
	// 				{
	// 					name: 'Editing List Elements',
	// 					value: 'updateListElements',
	// 					action: 'Editing multiple list elements',
	// 					description: 'Editing multiple list elements',
	// 				},
	// 				{
	// 					name: 'Editing Lists',
	// 					value: 'updateLists',
	// 					action: 'Editing multiple lists',
	// 					description: 'Editing multiple lists',
	// 				},
	// 				{
	// 					name: 'Get List Elements',
	// 					value: 'getListElements',
	// 					action: 'Get available list elements on the account',
	// 					description: 'Get available list elements on the account',
	// 				},
	// 				{
	// 					name: 'Get Lists',
	// 					value: 'getLists',
	// 					description: 'Get all account lists',
	// 					action: 'Get available lists',
	// 				},
	// 				{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' },
	// 			],
	// 			default: 'getLists',
	// 		},
	// 	],
	// 	iconUrl: 'icons/n8n-nodes-kommo/dist/nodes/Kommo/kommo_logo.svg',
	// 	name: 'n8n-nodes-preview-kommo.kommo',
	// },
	{
		displayName: 'Query PREWIEW',
		group: ['input'],
		version: 1,
		description: 'Query your data by executing SQL queries',
		defaults: { name: 'Query' },
		inputs: ['main'],
		outputs: ['main'],
		codex: { alias: ['Database', 'SQL', 'Query', 'Table'] },
		properties: [],
		iconUrl:
			'https://raw.githubusercontent.com/atekron/n8n-nodes-query/refs/heads/master/nodes/Query/query.svg',
		name: 'n8n-nodes-preview-query.query',
	},
	{
		displayName: 'TextManipulation PREWIEW',
		group: ['transform'],
		version: 1,
		description: 'Allows you to manipulate string values.',
		defaults: { name: 'TextManipulation' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
		codex: {
			categories: ['Utility'],
			alias: [
				'Capitalize',
				'Titlecase',
				'Camel Case',
				'Kebab Case',
				'Snake Case',
				'Concat',
				'Decode',
				'Encode',
				'Upper Case',
				'Lower Case',
				'Locale Upper Case',
				'Locale Lower Case',
				'Replace',
				'Trim',
				'Pad',
				'Substring',
				'Repeat',
				'Regex',
				'Entities',
			],
			resources: {
				primaryDocumentation: [{ url: 'https://github.com/lublak/n8n-nodes-text-manipulation' }],
			},
		},
		iconUrl:
			'https://raw.githubusercontent.com/lublak/n8n-nodes-text-manipulation/refs/heads/main/nodes/TextManipulation/TextManipulation.svg',
		name: 'n8n-nodes-preview-text-manipulation.textManipulation',
	},
	// {
	// 	displayName: 'XLSX to JSON Converter PREWIEW',
	// 	group: ['transform'],
	// 	version: 1,
	// 	description: 'Convert Excel spreadsheets to JSON via REST service',
	// 	defaults: { name: 'XLSX to JSON' },
	// 	inputs: ['main'],
	// 	outputs: ['main'],
	// 	subtitle: '={{$parameter["operation"] || "Convert Excel to JSON"}}',
	// 	properties: [],
	// 	iconUrl: 'icons/n8n-nodes-xlsx-to-json/dist/nodes/XlsxToJson/xlsxToJson.svg',
	// 	name: 'n8n-nodes-preview-xlsx-to-json.xlsxToJson',
	// },
];

export async function getNodeTypes(baseUrl: string) {
	const { data } = await axios.get(baseUrl + 'types/nodes.json', { withCredentials: true });
	return data;
}

export async function getCommunityNodeTypes() {
	return nodesPreview;
}

export async function getNodeTranslationHeaders(
	context: IRestApiContext,
): Promise<INodeTranslationHeaders | undefined> {
	return await makeRestApiRequest(context, 'GET', '/node-translation-headers');
}

export async function getNodesInformation(
	context: IRestApiContext,
	nodeInfos: INodeTypeNameVersion[],
): Promise<INodeTypeDescription[]> {
	return await makeRestApiRequest(context, 'POST', '/node-types', { nodeInfos });
}

export async function getNodeParameterOptions(
	context: IRestApiContext,
	sendData: OptionsRequestDto,
): Promise<INodePropertyOptions[]> {
	return await makeRestApiRequest(context, 'POST', '/dynamic-node-parameters/options', sendData);
}

export async function getResourceLocatorResults(
	context: IRestApiContext,
	sendData: ResourceLocatorRequestDto,
): Promise<INodeListSearchResult> {
	return await makeRestApiRequest(
		context,
		'POST',
		'/dynamic-node-parameters/resource-locator-results',
		sendData,
	);
}

export async function getResourceMapperFields(
	context: IRestApiContext,
	sendData: ResourceMapperFieldsRequestDto,
): Promise<ResourceMapperFields> {
	return await makeRestApiRequest(
		context,
		'POST',
		'/dynamic-node-parameters/resource-mapper-fields',
		sendData,
	);
}

export async function getLocalResourceMapperFields(
	context: IRestApiContext,
	sendData: ResourceMapperFieldsRequestDto,
): Promise<ResourceMapperFields> {
	return await makeRestApiRequest(
		context,
		'POST',
		'/dynamic-node-parameters/local-resource-mapper-fields',
		sendData,
	);
}

export async function getNodeParameterActionResult(
	context: IRestApiContext,
	sendData: ActionResultRequestDto,
): Promise<NodeParameterValueType> {
	return await makeRestApiRequest(
		context,
		'POST',
		'/dynamic-node-parameters/action-result',
		sendData,
	);
}
