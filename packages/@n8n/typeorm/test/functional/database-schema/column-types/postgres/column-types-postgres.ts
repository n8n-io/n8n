import 'reflect-metadata';
import { PostWithOptions } from './entity/PostWithOptions';
import { DataSource } from '../../../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { PostWithoutTypes } from './entity/PostWithoutTypes';
import { Post } from './entity/Post';

describe('database schema > column types > postgres', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			enabledDrivers: ['postgres'],
		});

		for (const connection of connections) {
			if (connection.driver.options.type === 'postgres') {
				// We want to have UTC as timezone
				await connection.query("SET TIME ZONE 'UTC';");
			}
		}
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('all types should work correctly - persist and hydrate', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);
				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('post');
				await queryRunner.release();

				const post = new Post();
				post.id = 1;
				post.name = 'Post';
				post.integer = 2147483647;
				post.int4 = 2147483647;
				post.int = 2147483647;
				post.smallint = 32767;
				post.int2 = 32767;
				post.bigint = '8223372036854775807';
				post.int8 = '8223372036854775807';
				post.numeric = '50';
				post.decimal = '50';
				post.doublePrecision = 15.357;
				post.float8 = 15.357;
				post.real = 5.5;
				post.float4 = 5.5;
				post.money = '$775,807.07';
				post.char = 'A';
				post.character = 'A';
				post.varchar = 'This is varchar';
				post.characterVarying = 'This is character varying';
				post.text = 'This is text';
				post.citext = 'This is text';
				post.hstore = 'name => Alice, surname => A, age => 30';
				post.bytea = Buffer.from('This is bytea');
				post.date = '2017-06-21';
				post.interval = '1 year 2 months 3 days 4 hours 5 minutes 6 seconds';
				post.time = '15:30:00';
				post.timeWithTimeZone = '15:30:00 PST';
				post.timetz = '15:30:00 PST';
				post.timestamp = new Date();
				post.timestamp.setMilliseconds(0);
				post.timestampWithTimeZone = new Date();
				post.timestampWithTimeZone.setMilliseconds(0);
				post.timestamptz = new Date();
				post.timestamptz.setMilliseconds(0);
				post.boolean = true;
				post.bool = false;
				post.enum = 'A';
				post.point = '(10,20)';
				post.line = '{1,2,3}';
				post.lseg = '(1,2), (3,4)';
				post.box = '(1,2),(3,4)'; // postgres swaps coordinates in database. This one will be saved like (3,4),(1,2)
				post.path = '((3,1),(2,8),(10,4))';
				post.polygon = '((3,1),(2,8),(10,4))';
				post.circle = '4, 5, 12';
				post.cidr = '192.168.100.128/25';
				post.inet = '192.168.100.128';
				post.macaddr = '08:00:2b:01:02:03';
				post.bit = '1';
				post.varbit = '100';
				post.bitVarying = '00';
				post.uuid = '0e37df36-f698-11e6-8dd4-cb9ced3df976';
				post.json = { id: 1, name: 'Post' };
				post.jsonb = { id: 1, name: 'Post' };
				post.int4range = '[10,20)';
				post.int8range = '[200000,500000)';
				post.numrange = '(10.5,20.2)';
				post.tsrange = '[2010-01-01 14:30,2010-01-01 15:30)';
				post.tstzrange = '[2010-01-01 14:30:00+00,2010-01-01 15:30:00+00)';
				post.daterange = '[2010-01-01,2010-01-05)';
				post.int4multirange = '{[10,20),[25,30)}';
				post.int8multirange = '{[200000,500000),[600000,700000)}';
				post.nummultirange = '{(10.5,20.2),(30.5,40.2)}';
				post.tsmultirange =
					'{["2010-01-01 14:30:00","2010-01-01 15:30:00"),["2010-01-01 16:30:00","2010-01-01 17:30:00")}';
				post.tstzmultirange =
					'{["2010-01-01 14:30:00+00","2010-01-01 15:30:00+00"),["2010-01-01 16:30:00+00","2010-01-01 17:30:00+00")}';
				post.datemultirange = '{[2010-01-01,2010-01-05),[2010-01-10,2010-01-15)}';
				post.xml = '<book><title>Manual</title><chapter>...</chapter></book>';
				post.array = [1, 2, 3];
				post.simpleArray = ['A', 'B', 'C'];
				post.simpleJson = { param: 'VALUE' };
				post.simpleEnum = 'A';
				await postRepository.save(post);

				const loadedPost = (await postRepository.findOneBy({
					id: 1,
				}))!;
				loadedPost.id.should.be.equal(post.id);
				loadedPost.name.should.be.equal(post.name);
				loadedPost.integer.should.be.equal(post.integer);
				loadedPost.int4.should.be.equal(post.int4);
				loadedPost.int.should.be.equal(post.int);
				loadedPost.smallint.should.be.equal(post.smallint);
				loadedPost.int2.should.be.equal(post.int2);
				loadedPost.bigint.should.be.equal(post.bigint);
				loadedPost.int8.should.be.equal(post.int8);
				loadedPost.numeric.should.be.equal(post.numeric);
				loadedPost.decimal.should.be.equal(post.decimal);
				loadedPost.doublePrecision.should.be.equal(post.doublePrecision);
				loadedPost.float8.should.be.equal(post.float8);
				loadedPost.real.should.be.equal(post.real);
				loadedPost.float4.should.be.equal(post.float4);
				loadedPost.money.should.be.equal(post.money);
				loadedPost.char.should.be.equal(post.char);
				loadedPost.character.should.be.equal(post.character);
				loadedPost.varchar.should.be.equal(post.varchar);
				loadedPost.characterVarying.should.be.equal(post.characterVarying);
				loadedPost.text.should.be.equal(post.text);
				loadedPost.citext.should.be.equal('This is text');
				loadedPost.hstore.should.be.equal(`"age"=>"30", "name"=>"Alice", "surname"=>"A"`);
				loadedPost.bytea.toString().should.be.equal(post.bytea.toString());
				loadedPost.date.should.be.equal(post.date);
				loadedPost.interval.years.should.be.equal(1);
				loadedPost.interval.months.should.be.equal(2);
				loadedPost.interval.days.should.be.equal(3);
				loadedPost.interval.hours.should.be.equal(4);
				loadedPost.interval.minutes.should.be.equal(5);
				loadedPost.interval.seconds.should.be.equal(6);
				loadedPost.time.should.be.equal(post.time);
				loadedPost.timeWithTimeZone.should.be.equal('15:30:00-08');
				loadedPost.timetz.should.be.equal('15:30:00-08');
				loadedPost.timestamp.valueOf().should.be.equal(post.timestamp.valueOf());
				// loadedPost.timestampWithTimeZone.getTime().should.be.equal(post.timestampWithTimeZone.getTime());
				loadedPost.timestamptz.valueOf().should.be.equal(post.timestamptz.valueOf());
				loadedPost.boolean.should.be.equal(post.boolean);
				loadedPost.bool.should.be.equal(post.bool);
				loadedPost.enum.should.be.equal(post.enum);
				loadedPost.point.should.be.eql({ x: 10, y: 20 });
				loadedPost.line.should.be.equal(post.line);
				loadedPost.lseg.should.be.equal('[(1,2),(3,4)]');
				// loadedPost.box.should.be.equal(post.box); // postgres swaps coordinates in database. This one will be saved like (3,4),(1,2)
				loadedPost.path.should.be.equal(post.path);
				loadedPost.polygon.should.be.equal(post.polygon);
				loadedPost.circle.should.be.eql({ x: 4, y: 5, radius: 12 });
				loadedPost.cidr.should.be.equal(post.cidr);
				loadedPost.inet.should.be.equal(post.inet);
				loadedPost.macaddr.should.be.equal(post.macaddr);
				loadedPost.bit.should.be.equal(post.bit);
				loadedPost.varbit.should.be.equal(post.varbit);
				loadedPost.bitVarying.should.be.equal(post.bitVarying);
				loadedPost.uuid.should.be.equal(post.uuid);
				loadedPost.json.should.be.eql(post.json);
				loadedPost.jsonb.should.be.eql(post.jsonb);
				loadedPost.int4range.should.be.eql(post.int4range);
				loadedPost.int8range.should.be.eql(post.int8range);
				loadedPost.numrange.should.be.eql(post.numrange);
				loadedPost.tsrange.should.be.eql(`["2010-01-01 14:30:00","2010-01-01 15:30:00")`);
				loadedPost.tstzrange.should.be.eql(`["2010-01-01 14:30:00+00","2010-01-01 15:30:00+00")`);
				loadedPost.daterange.should.be.eql(post.daterange);
				loadedPost.int4multirange.should.be.eql(post.int4multirange);
				loadedPost.int8multirange.should.be.eql(post.int8multirange);
				loadedPost.nummultirange.should.be.eql(post.nummultirange);
				loadedPost.tsmultirange.should.be.eql(post.tsmultirange);
				loadedPost.tstzmultirange.should.be.eql(post.tstzmultirange);
				loadedPost.datemultirange.should.be.eql(post.datemultirange);
				loadedPost.xml.should.be.equal(post.xml);
				loadedPost.array[0].should.be.equal(post.array[0]);
				loadedPost.array[1].should.be.equal(post.array[1]);
				loadedPost.array[2].should.be.equal(post.array[2]);
				loadedPost.simpleArray[0].should.be.equal(post.simpleArray[0]);
				loadedPost.simpleArray[1].should.be.equal(post.simpleArray[1]);
				loadedPost.simpleArray[2].should.be.equal(post.simpleArray[2]);
				loadedPost.simpleJson.param.should.be.equal(post.simpleJson.param);
				loadedPost.simpleEnum.should.be.equal(post.simpleEnum);

				table!.findColumnByName('id')!.type.should.be.equal('integer');
				table!.findColumnByName('name')!.type.should.be.equal('character varying');
				table!.findColumnByName('integer')!.type.should.be.equal('integer');
				table!.findColumnByName('int4')!.type.should.be.equal('integer');
				table!.findColumnByName('int')!.type.should.be.equal('integer');
				table!.findColumnByName('smallint')!.type.should.be.equal('smallint');
				table!.findColumnByName('int2')!.type.should.be.equal('smallint');
				table!.findColumnByName('bigint')!.type.should.be.equal('bigint');
				table!.findColumnByName('numeric')!.type.should.be.equal('numeric');
				table!.findColumnByName('decimal')!.type.should.be.equal('numeric');
				table!.findColumnByName('doublePrecision')!.type.should.be.equal('double precision');
				table!.findColumnByName('float8')!.type.should.be.equal('double precision');
				table!.findColumnByName('real')!.type.should.be.equal('real');
				table!.findColumnByName('float4')!.type.should.be.equal('real');
				table!.findColumnByName('money')!.type.should.be.equal('money');
				table!.findColumnByName('char')!.type.should.be.equal('character');
				table!.findColumnByName('character')!.type.should.be.equal('character');
				table!.findColumnByName('varchar')!.type.should.be.equal('character varying');
				table!.findColumnByName('characterVarying')!.type.should.be.equal('character varying');
				table!.findColumnByName('text')!.type.should.be.equal('text');
				table!.findColumnByName('citext')!.type.should.be.equal('citext');
				table!.findColumnByName('hstore')!.type.should.be.equal('hstore');
				table!.findColumnByName('bytea')!.type.should.be.equal('bytea');
				table!.findColumnByName('date')!.type.should.be.equal('date');
				table!.findColumnByName('interval')!.type.should.be.equal('interval');
				table!.findColumnByName('time')!.type.should.be.equal('time without time zone');
				table!.findColumnByName('timeWithTimeZone')!.type.should.be.equal('time with time zone');
				table!.findColumnByName('timetz')!.type.should.be.equal('time with time zone');
				table!.findColumnByName('timestamp')!.type.should.be.equal('timestamp without time zone');
				table!
					.findColumnByName('timestampWithTimeZone')!
					.type.should.be.equal('timestamp with time zone');
				table!.findColumnByName('timestamptz')!.type.should.be.equal('timestamp with time zone');
				table!.findColumnByName('boolean')!.type.should.be.equal('boolean');
				table!.findColumnByName('bool')!.type.should.be.equal('boolean');
				table!.findColumnByName('enum')!.type.should.be.equal('enum');
				table!.findColumnByName('point')!.type.should.be.equal('point');
				table!.findColumnByName('line')!.type.should.be.equal('line');
				table!.findColumnByName('lseg')!.type.should.be.equal('lseg');
				table!.findColumnByName('box')!.type.should.be.equal('box');
				table!.findColumnByName('path')!.type.should.be.equal('path');
				table!.findColumnByName('polygon')!.type.should.be.equal('polygon');
				table!.findColumnByName('circle')!.type.should.be.equal('circle');
				table!.findColumnByName('cidr')!.type.should.be.equal('cidr');
				table!.findColumnByName('inet')!.type.should.be.equal('inet');
				table!.findColumnByName('macaddr')!.type.should.be.equal('macaddr');
				table!.findColumnByName('bit')!.type.should.be.equal('bit');
				table!.findColumnByName('varbit')!.type.should.be.equal('bit varying');
				table!.findColumnByName('bitVarying')!.type.should.be.equal('bit varying');
				table!.findColumnByName('uuid')!.type.should.be.equal('uuid');
				table!.findColumnByName('xml')!.type.should.be.equal('xml');
				table!.findColumnByName('json')!.type.should.be.equal('json');
				table!.findColumnByName('jsonb')!.type.should.be.equal('jsonb');
				table!.findColumnByName('int4range')!.type.should.be.equal('int4range');
				table!.findColumnByName('int8range')!.type.should.be.equal('int8range');
				table!.findColumnByName('numrange')!.type.should.be.equal('numrange');
				table!.findColumnByName('tsrange')!.type.should.be.equal('tsrange');
				table!.findColumnByName('tstzrange')!.type.should.be.equal('tstzrange');
				table!.findColumnByName('daterange')!.type.should.be.equal('daterange');
				table!.findColumnByName('int4multirange')!.type.should.be.equal('int4multirange');
				table!.findColumnByName('int8multirange')!.type.should.be.equal('int8multirange');
				table!.findColumnByName('nummultirange')!.type.should.be.equal('nummultirange');
				table!.findColumnByName('tsmultirange')!.type.should.be.equal('tsmultirange');
				table!.findColumnByName('tstzmultirange')!.type.should.be.equal('tstzmultirange');
				table!.findColumnByName('datemultirange')!.type.should.be.equal('datemultirange');
				table!.findColumnByName('array')!.type.should.be.equal('integer');
				table!.findColumnByName('array')!.isArray!.should.be.true;
				table!.findColumnByName('simpleArray')!.type.should.be.equal('text');
				table!.findColumnByName('simpleJson')!.type.should.be.equal('text');
				table!.findColumnByName('simpleEnum')!.type.should.be.equal('enum');
			}),
		));

	it('all types should work correctly - persist and hydrate when options are specified on columns', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(PostWithOptions);
				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('post_with_options');
				await queryRunner.release();

				const post = new PostWithOptions();
				post.id = 1;
				post.numeric = '50.00';
				post.decimal = '50.00';
				post.char = 'AAA';
				post.character = 'AAA';
				post.varchar = 'This is varchar';
				post.characterVarying = 'This is character varying';
				post.timestamp = new Date();
				post.timestampWithTimeZone = new Date();
				post.time = '15:30:13.278';
				post.timeWithTimeZone = '15:30:13.27801+05';
				post.int4range = '[2,4)';
				await postRepository.save(post);

				const loadedPost = (await postRepository.findOneBy({
					id: 1,
				}))!;
				loadedPost.id.should.be.equal(post.id);
				loadedPost.numeric.should.be.equal(post.numeric);
				loadedPost.decimal.should.be.equal(post.decimal);
				loadedPost.char.should.be.equal(post.char);
				loadedPost.character.should.be.equal(post.character);
				loadedPost.varchar.should.be.equal(post.varchar);
				loadedPost.characterVarying.should.be.equal(post.characterVarying);
				loadedPost.timestamp.valueOf().should.be.equal(post.timestamp.valueOf());
				// loadedPost.timestampWithTimeZone.valueOf().should.be.equal(post.timestampWithTimeZone.valueOf());
				loadedPost.time.valueOf().should.be.equal(post.time.valueOf());
				loadedPost.timeWithTimeZone.valueOf().should.be.equal(post.timeWithTimeZone.valueOf());
				loadedPost.int4range.valueOf().should.be.equal(post.int4range.valueOf());

				table!.findColumnByName('id')!.type.should.be.equal('integer');
				table!.findColumnByName('numeric')!.type.should.be.equal('numeric');
				table!.findColumnByName('numeric')!.precision!.should.be.equal(5);
				table!.findColumnByName('numeric')!.scale!.should.be.equal(2);
				table!.findColumnByName('decimal')!.type.should.be.equal('numeric');
				table!.findColumnByName('decimal')!.precision!.should.be.equal(5);
				table!.findColumnByName('decimal')!.scale!.should.be.equal(2);
				table!.findColumnByName('char')!.type.should.be.equal('character');
				table!.findColumnByName('char')!.length!.should.be.equal('3');
				table!.findColumnByName('character')!.type.should.be.equal('character');
				table!.findColumnByName('character')!.length!.should.be.equal('3');
				table!.findColumnByName('varchar')!.type.should.be.equal('character varying');
				table!.findColumnByName('varchar')!.length!.should.be.equal('30');
				table!.findColumnByName('characterVarying')!.type.should.be.equal('character varying');
				table!.findColumnByName('characterVarying')!.length!.should.be.equal('30');
				table!.findColumnByName('timestamp')!.type.should.be.equal('timestamp without time zone');
				table!.findColumnByName('timestamp')!.precision!.should.be.equal(3);
				table!
					.findColumnByName('timestampWithTimeZone')!
					.type.should.be.equal('timestamp with time zone');
				table!.findColumnByName('timestampWithTimeZone')!.precision!.should.be.equal(5);
				table!.findColumnByName('time')!.type.should.be.equal('time without time zone');
				table!.findColumnByName('time')!.precision!.should.be.equal(3);
				table!.findColumnByName('timeWithTimeZone')!.type.should.be.equal('time with time zone');
				table!.findColumnByName('timeWithTimeZone')!.precision!.should.be.equal(5);
				table!.findColumnByName('int4range')!.type.should.be.equal('int4range');
				table!.findColumnByName('int4range')!.isNullable!.should.be.equal(true);
			}),
		));

	it('all types should work correctly - persist and hydrate when types are not specified on columns', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(PostWithoutTypes);
				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('post_without_types');
				await queryRunner.release();

				const post = new PostWithoutTypes();
				post.id = 1;
				post.name = 'Post';
				post.bit = true;
				post.datetime = new Date();
				post.datetime.setMilliseconds(0);
				await postRepository.save(post);

				const loadedPost = (await postRepository.findOneBy({
					id: 1,
				}))!;
				loadedPost.id.should.be.equal(post.id);
				loadedPost.name.should.be.equal(post.name);
				loadedPost.bit.should.be.equal(post.bit);
				loadedPost.datetime.valueOf().should.be.equal(post.datetime.valueOf());

				table!.findColumnByName('id')!.type.should.be.equal('integer');
				table!.findColumnByName('name')!.type.should.be.equal('character varying');
				table!.findColumnByName('bit')!.type.should.be.equal('boolean');
				table!.findColumnByName('datetime')!.type.should.be.equal('timestamp without time zone');
			}),
		));
});
