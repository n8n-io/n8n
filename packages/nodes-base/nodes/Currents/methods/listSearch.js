export async function getProjects(filter) {
    const response = await this.helpers.httpRequestWithAuthentication.call(this, 'currentsApi', {
        method: 'GET',
        url: 'https://api.currents.dev/v1/projects',
    });
    const projects = response.data ?? [];
    const results = projects
        .filter((project) => !filter ||
        project.name?.toLowerCase().includes(filter.toLowerCase()) ||
        project.projectId?.toLowerCase().includes(filter.toLowerCase()))
        .map((project) => ({
        name: project.name ?? project.projectId,
        value: project.projectId,
    }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return { results };
}
//# sourceMappingURL=listSearch.js.map