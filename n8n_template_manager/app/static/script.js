document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('resultsContainer');
    const paginationControls = document.getElementById('paginationControls');

    // Modal elements
    const importModal = document.getElementById('importModal');
    const modalTemplateName = document.getElementById('modalTemplateName');
    const n8nInstanceUrlInput = document.getElementById('n8nInstanceUrl');
    const n8nApiKeyInput = document.getElementById('n8nApiKey');
    const confirmImportButton = document.getElementById('confirmImportButton');
    const closeModalButton = document.getElementById('closeModalButton');
    const importStatus = document.getElementById('importStatus');

    let currentPage = 1;
    const pageSize = 20; // Should match API's default or be configurable
    let currentTemplateIdForImport = null;
    let templatesCache = {}; // To store fetched template details

    // --- API Endpoints ---
    const API_BASE_URL = '/api/v1'; // Adjust if your API prefix is different

    // --- Fetch and Display Templates ---
    async function fetchTemplates(page = 1, searchTerm = '', category = '') {
        let url = `${API_BASE_URL}/templates?page=${page}&size=${pageSize}`;
        if (searchTerm) {
            url += `&search=${encodeURIComponent(searchTerm)}`;
        }
        if (category) {
            url += `&category=${encodeURIComponent(category)}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // Cache templates
            if (data.items) {
                data.items.forEach(item => {
                    // We cache the whole item. If raw_json is very large and not always needed client-side
                    // before import, this strategy could be refined. For now, caching the item is fine.
                    templatesCache[item.id] = item; 
                });
            }
            displayTemplates(data.items);
            setupPagination(data.total, page, data.size); // data.size is actual items on page
            populateCategoryFilterOnce(data.items); // Populate categories based on current results
        } catch (error) {
            console.error('Error fetching templates:', error);
            resultsContainer.innerHTML = '<p>Error loading templates. Please try again later.</p>';
        }
    }

    function displayTemplates(templates) {
        resultsContainer.innerHTML = ''; // Clear previous results
        if (!templates || templates.length === 0) {
            resultsContainer.innerHTML = '<p>No templates found.</p>';
            return;
        }

        templates.forEach(template => {
            const card = document.createElement('div');
            card.className = 'template-card';

            let tagsHtml = '';
            if (template.tags && template.tags.length > 0) {
                tagsHtml = template.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join(' ');
            }

            let nodesHtml = '';
            if (template.nodes_summary && template.nodes_summary.length > 0) {
                nodesHtml = template.nodes_summary.map(node => `<span>${escapeHtml(node)}</span>`).join(' ');
            }
            
            card.innerHTML = `
                <h3>${escapeHtml(template.name)}</h3>
                <p>${escapeHtml(template.description || 'No description available.')}</p>
                ${template.category ? `<p class="category"><strong>Category:</strong> ${escapeHtml(template.category)}</p>` : ''}
                ${tagsHtml ? `<p class="tags"><strong>Tags:</strong> ${tagsHtml}</p>` : ''}
                ${nodesHtml ? `<p class="nodes"><strong>Nodes:</strong> ${nodesHtml}</p>` : ''}
                <button class="import-button" data-id="${template.id}" data-name="${escapeHtml(template.name)}">Import</button>
            `;
            resultsContainer.appendChild(card);
        });

        // Add event listeners to new import buttons
        document.querySelectorAll('.import-button').forEach(button => {
            button.addEventListener('click', handleImportButtonClick);
        });
    }

    // --- Populate Category Filter (Basic - could be improved) ---
    let categoriesPopulated = false;
    function populateCategoryFilterOnce(templates) {
        if (categoriesPopulated || !templates) return;
        
        const uniqueCategories = new Set();
        // First, try to get categories from a dedicated endpoint if available
        // For now, deriving from results. A better way is a dedicated /categories endpoint.
        fetch(`${API_BASE_URL}/templates?size=1000`) // Fetch a large number to get diverse categories
            .then(response => response.json())
            .then(data => {
                if (data.items) {
                    data.items.forEach(template => {
                        if (template.category) {
                            uniqueCategories.add(template.category);
                        }
                    });
                }
                
                if (uniqueCategories.size > 0) {
                    const sortedCategories = Array.from(uniqueCategories).sort();
                    sortedCategories.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = cat;
                        option.textContent = cat;
                        categoryFilter.appendChild(option);
                    });
                    categoriesPopulated = true; 
                } else if (templates && templates.length > 0) { // Fallback to initial templates list if fetch fails or yields no categories
                    templates.forEach(template => {
                         if (template.category) uniqueCategories.add(template.category);
                    });
                     const sortedCategories = Array.from(uniqueCategories).sort();
                    sortedCategories.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = cat;
                        option.textContent = cat;
                        categoryFilter.appendChild(option);
                    });
                    categoriesPopulated = true;
                }
            })
            .catch(error => console.error("Error fetching categories:", error));
    }


    // --- Pagination ---
    function setupPagination(totalItems, currentPage, itemsPerPage) {
        paginationControls.innerHTML = ''; // Clear previous controls
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (totalPages <= 1) return;

        // Previous Button
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                fetchTemplates(currentPage - 1, searchInput.value, categoryFilter.value);
            }
        });
        paginationControls.appendChild(prevButton);

        // Page Numbers (simplified for brevity)
        // Display current page and total pages
        const pageInfo = document.createElement('span');
        pageInfo.textContent = ` Page ${currentPage} of ${totalPages} `;
        pageInfo.style.margin = "0 10px";
        paginationControls.appendChild(pageInfo);


        // Next Button
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                fetchTemplates(currentPage + 1, searchInput.value, categoryFilter.value);
            }
        });
        paginationControls.appendChild(nextButton);
    }

    // --- Import Modal Logic ---
    function handleImportButtonClick(event) {
        currentTemplateIdForImport = event.target.dataset.id;
        const templateName = event.target.dataset.name;
        modalTemplateName.textContent = templateName;
        importStatus.textContent = ''; // Clear previous status
        n8nInstanceUrlInput.value = localStorage.getItem('n8nInstanceUrl') || ''; // Load saved URL
        n8nApiKeyInput.value = localStorage.getItem('n8nApiKey') || ''; // Load saved API key
        importModal.style.display = 'block';
    }

    closeModalButton.addEventListener('click', () => {
        importModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => { // Close modal if clicked outside
        if (event.target === importModal) {
            importModal.style.display = 'none';
        }
    });

    confirmImportButton.addEventListener('click', async () => {
        const instanceUrl = n8nInstanceUrlInput.value.trim();
        const apiKey = n8nApiKeyInput.value.trim();

        if (!currentTemplateIdForImport || !instanceUrl || !apiKey) {
            importStatus.textContent = 'Please fill in all fields.';
            importStatus.style.color = 'red';
            return;
        }
        
        // The template details (including raw_json if needed by the API directly, though our current API
        // fetches it server-side based on ID) are in templatesCache.
        // Our current POST /import_to_n8n API only needs the template_id, 
        // as it fetches the raw_json from the DB on the server-side.
        // So, direct use of templatesCache in the payload isn't required here, but the cache is good for other uses.
        // For example, if we wanted to show more details from the cache without a new API call.

        // Save URL and API key for next time (optional, consider security for API key)
        localStorage.setItem('n8nInstanceUrl', instanceUrl);
        // localStorage.setItem('n8nApiKey', apiKey); // Be cautious with storing API keys in localStorage

        importStatus.textContent = 'Importing...';
        importStatus.style.color = 'blue';
        confirmImportButton.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/templates/import_to_n8n`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    template_id: parseInt(currentTemplateIdForImport),
                    n8n_instance_url: instanceUrl,
                    n8n_api_key: apiKey,
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                importStatus.textContent = `Success! Workflow imported. New ID: ${result.n8n_workflow_id}. URL: ${result.n8n_workflow_url || 'N/A'}`;
                importStatus.style.color = 'green';
                // Optionally close modal after a delay
                setTimeout(() => { importModal.style.display = 'none'; }, 3000);
            } else {
                importStatus.textContent = `Error: ${result.message || 'Unknown error during import.'}`;
                importStatus.style.color = 'red';
            }
        } catch (error) {
            console.error('Import API call failed:', error);
            importStatus.textContent = `Import failed: ${error.message || 'Network error or server issue.'}`;
            importStatus.style.color = 'red';
        } finally {
            confirmImportButton.disabled = false;
        }
    });

    // --- Event Listeners ---
    searchButton.addEventListener('click', () => {
        currentPage = 1; // Reset to first page for new search
        fetchTemplates(currentPage, searchInput.value, categoryFilter.value);
    });

    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            currentPage = 1;
            fetchTemplates(currentPage, searchInput.value, categoryFilter.value);
        }
    });
    
    categoryFilter.addEventListener('change', () => {
        currentPage = 1; // Reset to first page when category changes
        fetchTemplates(currentPage, searchInput.value, categoryFilter.value);
    });

    // --- Utility ---
    function escapeHtml(unsafe) {
        if (unsafe === null || typeof unsafe === 'undefined') {
            return '';
        }
        return unsafe
             .toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    // --- Initial Load ---
    fetchTemplates(currentPage); // Load initial set of templates
});
