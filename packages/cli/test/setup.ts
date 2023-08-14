import nock from 'nock';

export default async () => {
	nock.disableNetConnect();
	nock.enableNetConnect('127.0.0.1');
};
