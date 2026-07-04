import { Cliente } from './entity/cliente';
import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { TipoCliente } from './entity/tipo-cliente';

describe('github issue #1754 Repository.save() always updating ManyToOne relation', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work as expected', () =>
		Promise.all(
			connections.map(async (connection) => {
				const tipoCliente1 = new TipoCliente();
				tipoCliente1.id = 1;
				tipoCliente1.descricao = 'Mensalista';
				await connection.manager.save(tipoCliente1);

				const tipoCliente2 = new TipoCliente();
				tipoCliente2.id = 2;
				tipoCliente2.descricao = 'XXXX';
				await connection.manager.save(tipoCliente2);

				const cliente = new Cliente();
				cliente.id = 1;
				cliente.nome = 'Kirliam';
				cliente.tipo = tipoCliente1;
				await connection.manager.save(cliente);

				// The issue happens when I receive the cliente JSON from user interface
				// 1. First I tried to call save() after receive the JSON
				let myReceivedJson1 = {
					id: 1,
					nome: 'Kirliam changed 1',
					tipo: { id: 1, descricao: 'Mensalista' },
				};
				await connection.manager.getRepository(Cliente).save(myReceivedJson1);

				// 2. After I tried to preload the entity before saving. I was expecting that just
				// the name column to be updated, but in both cases tipoCliente is also being updated.
				let myReceivedJson2 = {
					id: 1,
					nome: 'Kirliam changed 2',
					tipo: { id: 1, descricao: 'Mensalista' },
				};
				let clienteDb1: Cliente = (await connection.manager
					.getRepository(Cliente)
					.preload(myReceivedJson2)) as Cliente;
				await connection.manager.getRepository(Cliente).save(clienteDb1);

				let myReceivedJson3 = {
					id: 1,
					nome: 'Kirliam changed 3',
					tipo: { id: 2, descricao: 'XXXX' },
				};
				await connection.manager.getRepository(Cliente).save(myReceivedJson3);

				// Fail just to check the query log!
				// Query from log:  UPDATE `cliente` SET `nome`=?, `tipoCliente`=?  WHERE `id`=? -- PARAMETERS: ["Kirliam changed 2",1,1]
				// expect(false, "Verificar as queries!!!").is.true;
			}),
		));
});
