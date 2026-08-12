import nock from 'nock';

export default async () => {
	nock.disableNetConnect();
};
