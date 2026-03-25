import axios from 'axios';
import { stringify } from 'qs';

// Global axios defaults

axios.defaults.timeout = 300000;
// Prevent axios from adding x-form-www-urlencoded headers by default
axios.defaults.headers.post = {};
axios.defaults.headers.put = {};
axios.defaults.headers.patch = {};
axios.defaults.paramsSerializer = (params) => {
	if (params instanceof URLSearchParams) {
		return params.toString();
	}
	return stringify(params, { arrayFormat: 'indices' });
};
// Disable axios proxy, we handle it ourselves
// Axios proxy option has problems: https://github.com/axios/axios/issues/4531
axios.defaults.proxy = false;
