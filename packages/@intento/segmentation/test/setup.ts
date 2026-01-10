import nock from 'nock';

// Jest global setup function
// eslint-disable-next-line import-x/no-default-export
export default () => {
	nock.disableNetConnect();
};
