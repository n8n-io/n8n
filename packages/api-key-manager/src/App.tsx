import { useState, useEffect } from 'react';
import './index.css';

interface ApiKey {
	id: string;
	key: string;
	name: string;
	service: string;
	created: string;
	status: 'Active' | 'Revoked';
}

function generateUUID() {
	return crypto.randomUUID();
}

function generateKey() {
	return `n8n_live_${Array.from(crypto.getRandomValues(new Uint8Array(16)))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')}`;
}

function App() {
	const [keys, setKeys] = useState<ApiKey[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// GENUINE DEPLOYMENT: Loading from BFF (Server-Side Proxy)
		// This prevents keys from being bundled into the client JS.
		async function fetchKeys() {
			try {
				const res = await fetch('http://localhost:3001/api/keys');
				if (!res.ok) throw new Error('Failed to fetch keys');
				const data = await res.json();
				setKeys(data);
			} catch (err) {
				console.error('Key fetch failed', err);
			} finally {
				setLoading(false);
			}
		}

		fetchKeys();
	}, []);

	const handleCreate = () => {
		const newKey: ApiKey = {
			id: generateUUID(),
			name: `New Key ${keys.length + 1}`,
			service: 'Generic Service',
			key: generateKey(),
			created: new Date().toISOString().split('T')[0],
			status: 'Active',
		};
		setKeys([newKey, ...keys]);
	};

	const handleRevoke = (id: string) => {
		setKeys(keys.filter((k) => k.id !== id));
	};

	return (
		<div className="container">
			<h1>API Credentials</h1>

			<div className="card">
				<div className="action-bar">
					<div>
						<h2 className="section-title">Active Keys</h2>
						<p className="section-description">Manage your programmatic access keys.</p>
					</div>
					<button className="primary" onClick={handleCreate}>
						+ Generate New Key
					</button>
				</div>

				<div className="key-list">
					{loading ? (
						<div className="loading-state">Decrypting Vault...</div>
					) : (
						keys.map((k) => (
							<div key={k.id} className="key-item">
								<div>
									<div className="key-name">{k.name}</div>
									<div className="service-name">{k.service}</div>
									<div className="key-value">{k.key}</div>
								</div>
								<div className="key-meta">
									<span className="status-badge">{k.status}</span>
									<span className="key-date">{k.created}</span>
									<button
										className="icon-btn"
										onClick={() => handleRevoke(k.id)}
										title="Revoke Key"
									>
										🗑️
									</button>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}

export default App;
